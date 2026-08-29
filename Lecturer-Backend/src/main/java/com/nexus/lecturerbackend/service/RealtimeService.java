package com.nexus.lecturerbackend.service;

import java.util.Map;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class RealtimeService {

    private final SimpMessagingTemplate messagingTemplate;

    public RealtimeService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void notifyUsers(Long fromUserId, Long toUserId, String eventType, Object payload) {
        Map<String, Object> message = Map.of(
                "type", eventType,
                "data", payload
        );
        if (fromUserId != null) {
            messagingTemplate.convertAndSend("/topic/messages/" + fromUserId, message, (java.util.Map<String, Object>) null);
        }
        if (toUserId != null && !toUserId.equals(fromUserId)) {
            messagingTemplate.convertAndSend("/topic/messages/" + toUserId, message, (java.util.Map<String, Object>) null);
        }
    }
}
