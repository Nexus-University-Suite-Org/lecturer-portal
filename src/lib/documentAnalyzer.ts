export interface DocumentAnalysisResult {
  questions: ExtractedQuestion[];
  metadata: {
    totalQuestions: number;
    questionTypes: string[];
    estimatedDifficulty: "easy" | "medium" | "hard" | "mixed";
    processingTime: number;
  };
  rawText: string;
}

export interface ExtractedQuestion {
  id: string;
  question: string;
  type: "multiple_choice" | "true_false" | "short_answer";
  options?: string[];
  correct_answer: string | number;
  explanation?: string;
  points: number;
  difficulty: "easy" | "medium" | "hard";
  confidence: number; // 0-1, how confident the system is in the extraction
  originalText: string; // The raw text this was extracted from
}

export class DocumentAnalyzer {
  // Common patterns for question identification
  private static readonly QUESTION_PATTERNS = {
    multiple_choice: [
      /^\d+\.\s*(.+?)\s*\n\s*a\)\s*(.+?)\s*\n\s*b\)\s*(.+?)\s*\n\s*c\)\s*(.+?)\s*\n\s*d\)\s*(.+?)\s*\n\s*Answer:\s*([a-d])/im,
      /^(\d+)\.\s*(.+?)\s*\n\s*A\.\s*(.+?)\s*\n\s*B\.\s*(.+?)\s*\n\s*C\.\s*(.+?)\s*\n\s*D\.\s*(.+?)\s*\n\s*Correct Answer:\s*([A-D])/im,
      /^Question\s*\d*:\s*(.+?)\s*\n\s*1\)\s*(.+?)\s*\n\s*2\)\s*(.+?)\s*\n\s*3\)\s*(.+?)\s*\n\s*4\)\s*(.+?)\s*\n\s*Answer:\s*(\d)/im,
    ],
    true_false: [
      /^(\d+)\.\s*(.+?)\s*\n\s*Answer:\s*(True|False|true|false|T|F)/im,
      /^(.+?)\s*\(True\/False\)\s*\n\s*Answer:\s*(True|False|true|false|T|F)/im,
    ],
    short_answer: [
      /^(\d+)\.\s*(.+?)\s*\n\s*Answer:\s*(.+?)(?:\n|$)/im,
      /^Question\s*\d*:\s*(.+?)\s*\n\s*Answer:\s*(.+?)(?:\n|$)/im,
    ],
  };

  // Keywords that indicate question types
  private static readonly TYPE_INDICATORS = {
    multiple_choice: [
      "choose",
      "select",
      "which of the following",
      "a)",
      "b)",
      "c)",
      "d)",
      "a.",
      "b.",
      "c.",
      "d.",
      "A.",
      "B.",
      "C.",
      "D.",
      "1)",
      "2)",
      "3)",
      "4)",
    ],
    true_false: ["true or false", "true/false", "t/f", "correct or incorrect"],
    short_answer: [
      "explain",
      "describe",
      "what is",
      "define",
      "how does",
      "why does",
    ],
  };

  static async analyzeDocument(file: File): Promise<DocumentAnalysisResult> {
    const startTime = Date.now();

    try {
      // Extract text from the document
      const rawText = await this.extractTextFromFile(file);

      // Analyze and extract questions
      const questions = this.extractQuestions(rawText);

      // Generate metadata
      const metadata = {
        totalQuestions: questions.length,
        questionTypes: [...new Set(questions.map((q) => q.type))],
        estimatedDifficulty: this.estimateDifficulty(questions),
        processingTime: Date.now() - startTime,
      };

      return {
        questions,
        metadata,
        rawText,
      };
    } catch (error) {
      console.error("Document analysis error:", error);
      throw new Error(
        `Failed to analyze document: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private static async extractTextFromFile(file: File): Promise<string> {
    const fileType = file.type.toLowerCase();

    if (fileType === "text/plain") {
      return await this.readTextFile(file);
    } else if (fileType === "application/pdf") {
      return await this.extractTextFromPDF(file);
    } else if (fileType.includes("word") || fileType.includes("document")) {
      return await this.extractTextFromWord(file);
    } else {
      // Try to read as text for other formats
      try {
        return await this.readTextFile(file);
      } catch {
        throw new Error(
          `Unsupported file type: ${fileType}. Please upload PDF, DOCX, or TXT files.`,
        );
      }
    }
  }

  private static async readTextFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  }

  private static async extractTextFromPDF(file: File): Promise<string> {
    try {
      // Dynamically import pdfjs-dist
      const pdfjs = await import("pdfjs-dist");

      // Configure the worker - use local file from public folder
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

      // Read file as ArrayBuffer
      const arrayBuffer = await this.readFileAsArrayBuffer(file);

      // Load PDF document
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

      let fullText = "";

      // Extract text from each page
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str || "")
          .join(" ");
        fullText += pageText + "\n";
      }

      return fullText.trim();
    } catch (error) {
      throw new Error(
        `PDF parsing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private static async extractTextFromWord(file: File): Promise<string> {
    try {
      // Dynamically import mammoth
      const mammoth = await import("mammoth");

      // Read file as ArrayBuffer
      const arrayBuffer = await this.readFileAsArrayBuffer(file);

      // Extract text from Word document
      const result = await mammoth.extractRawText({ arrayBuffer });

      return result.value.trim();
    } catch (error) {
      throw new Error(
        `Word document parsing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private static async readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsArrayBuffer(file);
    });
  }

  private static extractQuestions(text: string): ExtractedQuestion[] {
    const questions: ExtractedQuestion[] = [];
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    let currentQuestion: Partial<ExtractedQuestion> | null = null;
    let questionBuffer: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check if this line starts a new question
      if (this.isQuestionStart(line)) {
        // Save previous question if exists
        if (currentQuestion && questionBuffer.length > 0) {
          const completedQuestion = this.processQuestionBuffer(
            questionBuffer,
            currentQuestion,
          );
          if (completedQuestion) {
            questions.push(completedQuestion);
          }
        }

        // Start new question
        currentQuestion = {
          id: `q_${questions.length + 1}`,
          question: this.cleanQuestionText(line),
          originalText: line,
          confidence: 0.8,
        };
        questionBuffer = [line];
      } else if (currentQuestion) {
        // Continue building current question
        questionBuffer.push(line);

        // Check for answer indicators
        if (this.isAnswerLine(line)) {
          currentQuestion.correct_answer = this.extractAnswer(line);
        }
      }
    }

    // Process the last question
    if (currentQuestion && questionBuffer.length > 0) {
      const completedQuestion = this.processQuestionBuffer(
        questionBuffer,
        currentQuestion,
      );
      if (completedQuestion) {
        questions.push(completedQuestion);
      }
    }

    // If no structured questions found, try alternative parsing
    if (questions.length === 0) {
      return this.fallbackQuestionExtraction(text);
    }

    return questions;
  }

  private static isQuestionStart(line: string): boolean {
    // Check for numbered questions
    if (/^\d+\./.test(line)) return true;

    // Check for "Question" prefix
    if (/^Question\s*\d*:?/i.test(line)) return true;

    // Check for question marks
    if (line.includes("?") && line.length > 10) return true;

    return false;
  }

  private static cleanQuestionText(text: string): string {
    // Remove numbering and clean up
    return text
      .replace(/^\d+\.\s*/, "")
      .replace(/^Question\s*\d*:?\s*/i, "")
      .trim();
  }

  private static isAnswerLine(line: string): boolean {
    return (
      /^Answer:?\s*/i.test(line) ||
      /^Correct:?\s*/i.test(line) ||
      /^\([A-Da-d]\)/.test(line)
    );
  }

  private static extractAnswer(line: string): string {
    const match =
      line.match(/^Answer:?\s*(.+)/i) ||
      line.match(/^Correct:?\s*(.+)/i) ||
      line.match(/^\(([A-Da-d])\)/);

    return match ? match[1].trim() : line.trim();
  }

  private static processQuestionBuffer(
    buffer: string[],
    question: Partial<ExtractedQuestion>,
  ): ExtractedQuestion | null {
    const fullText = buffer.join("\n");

    // Determine question type
    const questionType = this.determineQuestionType(fullText);

    // Extract options for multiple choice
    let options: string[] | undefined;
    let correctAnswerIndex: string | number = "";

    if (questionType === "multiple_choice") {
      options = this.extractOptions(buffer);

      // Convert correct answer from letter format (e.g., "B. Queue") to index (1)
      const answerStr = (question.correct_answer || "")
        .toString()
        .trim()
        .toUpperCase();
      const letterMatch = answerStr.match(/^([A-D])/);
      if (letterMatch && options.length > 0) {
        const letter = letterMatch[1];
        // Convert letter to index: A=0, B=1, C=2, D=3
        correctAnswerIndex = letter.charCodeAt(0) - "A".charCodeAt(0);
      } else {
        correctAnswerIndex = "";
      }
    } else {
      correctAnswerIndex = question.correct_answer || "";
    }

    // Estimate difficulty
    const difficulty = this.estimateQuestionDifficulty(fullText);

    // Calculate confidence based on structure
    const confidence = this.calculateConfidence(fullText, questionType);

    return {
      id: question.id || `q_${Date.now()}`,
      question: question.question || "",
      type: questionType,
      options,
      correct_answer: correctAnswerIndex,
      explanation: "",
      points: 1,
      difficulty,
      confidence,
      originalText: question.originalText || fullText,
    };
  }

  private static determineQuestionType(
    text: string,
  ): "multiple_choice" | "true_false" | "short_answer" {
    const lowerText = text.toLowerCase();

    // Check for multiple choice indicators
    if (
      this.TYPE_INDICATORS.multiple_choice.some((indicator) =>
        lowerText.includes(indicator),
      )
    ) {
      return "multiple_choice";
    }

    // Check for true/false indicators
    if (
      this.TYPE_INDICATORS.true_false.some((indicator) =>
        lowerText.includes(indicator),
      )
    ) {
      return "true_false";
    }

    // Default to short answer
    return "short_answer";
  }

  private static extractOptions(lines: string[]): string[] {
    const options: string[] = [];

    for (const line of lines) {
      // Never treat explicit answer lines as options.
      if (/^\s*(Answer|Correct):/i.test(line)) {
        continue;
      }

      // Handle concatenated options like "A. StackB. QueueC. TreeD. Graph".
      const segments = line
        .split(/(?=[A-D][\).]\s*)/)
        .map((segment) => segment.trim())
        .filter((segment) => /^[A-D][\).]\s*/.test(segment));

      for (const segment of segments) {
        const content = segment.replace(/^[A-D][\).]\s*/, "").trim();
        if (content.length > 0) {
          options.push(content);
        }
      }
    }

    // Keep only the first four options (A-D) to avoid accidental over-capture.
    return options.slice(0, 4);
  }

  private static estimateQuestionDifficulty(
    text: string,
  ): "easy" | "medium" | "hard" {
    const words = text.split(/\s+/).length;

    if (words < 20) return "easy";
    if (words < 50) return "medium";
    return "hard";
  }

  private static calculateConfidence(text: string, type: string): number {
    let confidence = 0.5; // Base confidence

    // Structured questions get higher confidence
    if (text.includes("Answer:")) confidence += 0.2;
    if (text.includes("?")) confidence += 0.1;
    if (type === "multiple_choice" && text.match(/[a-dA-D][\).\s]/g))
      confidence += 0.2;

    return Math.min(confidence, 1.0);
  }

  private static fallbackQuestionExtraction(text: string): ExtractedQuestion[] {
    // Simple fallback: split by double newlines and treat each block as a potential question
    const blocks = text
      .split(/\n\s*\n/)
      .filter((block) => block.trim().length > 10);

    return blocks.slice(0, 20).map((block, index) => ({
      id: `q_${index + 1}`,
      question: block.split("\n")[0].trim(),
      type: "short_answer" as const,
      correct_answer: "",
      explanation: "",
      points: 1,
      difficulty: "medium" as const,
      confidence: 0.3,
      originalText: block,
    }));
  }

  private static estimateDifficulty(
    questions: ExtractedQuestion[],
  ): "easy" | "medium" | "hard" | "mixed" {
    if (questions.length === 0) return "medium";

    const difficulties = questions.map((q) => q.difficulty);
    const uniqueDifficulties = [...new Set(difficulties)];

    if (uniqueDifficulties.length === 1) {
      return uniqueDifficulties[0];
    }

    // Check if mostly one difficulty
    const counts = difficulties.reduce(
      (acc, diff) => {
        acc[diff] = (acc[diff] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const maxCount = Math.max(...Object.values(counts));
    if (maxCount > questions.length * 0.7) {
      return Object.keys(counts).find((key) => counts[key] === maxCount) as any;
    }

    return "mixed";
  }
}
