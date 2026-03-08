/**
 * codebakers_generate_chatbot
 *
 * AI Chatbot Generator - In-App Help Assistant
 *
 * Generates AI chatbot component that:
 * - Knows entire source code
 * - Can answer questions about the app
 * - Helps users navigate features
 * - Integrates into help section
 * - Uses RAG (retrieval-augmented generation)
 */
interface ChatbotArgs {
    position?: 'bottom-right' | 'bottom-left' | 'sidebar';
    include_api_knowledge?: boolean;
    include_component_knowledge?: boolean;
}
export declare function generateChatbot(args?: ChatbotArgs): Promise<string>;
export {};
//# sourceMappingURL=generate-chatbot.d.ts.map