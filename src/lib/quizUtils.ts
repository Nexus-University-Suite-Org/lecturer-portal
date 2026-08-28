// Utility function to auto-close expired quizzes
export const autoCloseExpiredQuizzes = async (_userId?: string) => {
  try {
    return [];
  } catch (error) {
    console.error("Error in autoCloseExpiredQuizzes:", error);
    return [];
  }
};
