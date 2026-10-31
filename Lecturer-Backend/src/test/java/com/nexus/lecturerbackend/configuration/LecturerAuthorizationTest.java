package com.nexus.lecturerbackend.configuration;

import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.nexus.lecturerbackend.controller.AuthController;
import com.nexus.lecturerbackend.configuration.JwtUtil;
import com.nexus.lecturerbackend.service.AuthService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = true)
@Import({SecurityConfig.class, JwtAuthFilter.class, LecturerAuthorizationTest.ProtectedProbeController.class})
@TestPropertySource(properties = "lecturer.cors.allowed-origins=http://localhost")
class LecturerAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AuthService authService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private NexusIdentityTokenVerifier identityTokenVerifier;

    @Test
    void applicationEndpointsRejectAnonymousRequests() throws Exception {
        mockMvc.perform(get("/api/private/probe"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void lecturerRoleCanReachApplicationEndpoints() throws Exception {
        mockMvc.perform(get("/api/private/probe").with(user("lecturer").roles("LECTURER")))
                .andExpect(status().isOk());
    }

    @Test
    void applicationEndpointsRejectNonLecturerRoles() throws Exception {
        mockMvc.perform(get("/api/private/probe").with(user("student").roles("STUDENT")))
                .andExpect(status().isForbidden());
    }

    @Test
    void loginRemainsPublic() throws Exception {
        mockMvc.perform(post("/api/v1/auth/student/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"lecturer@example.edu\",\"password\":\"password\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void passwordChangeUsesAuthenticatedUserInsteadOfRequestUid() throws Exception {
        var authentication = new UsernamePasswordAuthenticationToken(
                42L, null, List.of(new SimpleGrantedAuthority("ROLE_LECTURER")));

        mockMvc.perform(post("/api/v1/auth/change-password")
                        .with(authentication(authentication))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"uid\":99,\"current_password\":\"old\",\"new_password\":\"new\"}"))
                .andExpect(status().isOk());

        verify(authService).changePassword(42L, "old", "new");
    }

    @RestController
    static class ProtectedProbeController {

        @GetMapping("/api/private/probe")
        String probe() {
            return "ok";
        }
    }
}
