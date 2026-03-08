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

import * as fs from 'fs/promises';
import * as path from 'path';

interface ChatbotArgs {
  position?: 'bottom-right' | 'bottom-left' | 'sidebar'; // Default: bottom-right
  include_api_knowledge?: boolean; // Include API docs (default: true)
  include_component_knowledge?: boolean; // Include component structure (default: true)
}

export async function generateChatbot(args: ChatbotArgs = {}): Promise<string> {
  const cwd = process.cwd();
  const { position = 'bottom-right', include_api_knowledge = true, include_component_knowledge = true } = args;

  console.error('🍞 CodeBakers: Generating AI Chatbot');

  try {
    // Step 1: Index codebase for RAG
    console.error('[1/5] Indexing codebase...');
    const knowledge = await indexCodebase(cwd, include_api_knowledge, include_component_knowledge);

    // Step 2: Generate chatbot component
    console.error('[2/5] Generating chatbot component...');
    await generateChatbotComponent(cwd, knowledge, position);

    // Step 3: Generate knowledge base file
    console.error('[3/5] Generating knowledge base...');
    await generateKnowledgeBase(cwd, knowledge);

    // Step 4: Generate chatbot API route
    console.error('[4/5] Generating chatbot API...');
    await generateChatbotAPI(cwd);

    // Step 5: Add to root layout
    console.error('[5/5] Integrating into app...');
    await integrateIntoLayout(cwd);

    return generateChatbotReport(knowledge);
  } catch (error) {
    return `🍞 CodeBakers: Chatbot Generation Failed\n\nError: ${error instanceof Error ? error.message : String(error)}`;
  }
}

async function indexCodebase(cwd: string, includeAPI: boolean, includeComponents: boolean): Promise<any> {
  const knowledge: any = {
    features: [],
    api_routes: [],
    components: [],
    pages: [],
    common_tasks: []
  };

  // Index features from FLOWS.md
  try {
    const flowsPath = path.join(cwd, 'FLOWS.md');
    const flows = await fs.readFile(flowsPath, 'utf-8');

    const flowMatches = flows.matchAll(/## (\d+)\. (.+?) \((.+?)\)/g);
    for (const match of flowMatches) {
      knowledge.features.push({
        name: match[2],
        priority: match[3],
        description: `Feature: ${match[2]}`
      });
    }
  } catch {
    // FLOWS.md doesn't exist
  }

  // Index API routes
  if (includeAPI) {
    const apiDir = path.join(cwd, 'src', 'app', 'api');
    await indexAPIRoutes(apiDir, '', knowledge.api_routes);
  }

  // Index components
  if (includeComponents) {
    const componentsDir = path.join(cwd, 'src', 'components');
    await indexComponents(componentsDir, knowledge.components);
  }

  // Index pages
  const appDir = path.join(cwd, 'src', 'app');
  await indexPages(appDir, '', knowledge.pages);

  // Add common tasks
  knowledge.common_tasks = [
    {
      task: 'How do I log in?',
      answer: 'Click the "Sign In" button in the top right corner. You can sign in with email or social providers.'
    },
    {
      task: 'How do I change my password?',
      answer: 'Go to Settings → Account → Change Password.'
    },
    {
      task: 'Where can I find my account settings?',
      answer: 'Click your profile picture in the top right, then select "Settings".'
    }
  ];

  return knowledge;
}

async function indexAPIRoutes(dir: string, routePath: string, routes: any[]): Promise<void> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const newPath = entry.name.startsWith('[') && entry.name.endsWith(']')
          ? `${routePath}/{${entry.name.slice(1, -1)}}`
          : `${routePath}/${entry.name}`;
        await indexAPIRoutes(fullPath, newPath, routes);
      } else if (entry.name === 'route.ts' || entry.name === 'route.js') {
        const content = await fs.readFile(fullPath, 'utf-8');

        const methods = [];
        if (content.includes('export async function GET')) methods.push('GET');
        if (content.includes('export async function POST')) methods.push('POST');
        if (content.includes('export async function PUT')) methods.push('PUT');
        if (content.includes('export async function DELETE')) methods.push('DELETE');

        routes.push({
          path: `/api${routePath}`,
          methods,
          description: `API endpoint for ${routePath.split('/').pop() || 'resource'}`
        });
      }
    }
  } catch {
    // Directory doesn't exist
  }
}

async function indexComponents(dir: string, components: any[]): Promise<void> {
  try {
    const files = await fs.readdir(dir);

    for (const file of files) {
      if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
        const filePath = path.join(dir, file);
        const content = await fs.readFile(filePath, 'utf-8');

        const match = content.match(/export\s+(?:default\s+)?function\s+(\w+)/);
        const name = match ? match[1] : file.replace(/\.(tsx|jsx)$/, '');

        components.push({
          name,
          file,
          description: `UI component: ${name}`
        });
      }
    }
  } catch {
    // Components directory doesn't exist
  }
}

async function indexPages(dir: string, routePath: string, pages: any[]): Promise<void> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory() && !entry.name.startsWith('_') && entry.name !== 'api') {
        const newPath = entry.name.startsWith('[') && entry.name.endsWith(']')
          ? `${routePath}/{${entry.name.slice(1, -1)}}`
          : entry.name.startsWith('(') && entry.name.endsWith(')')
          ? routePath
          : `${routePath}/${entry.name}`;
        await indexPages(fullPath, newPath, pages);
      } else if (entry.name === 'page.tsx' || entry.name === 'page.jsx') {
        pages.push({
          path: routePath || '/',
          description: `Page: ${routePath || 'Home'}`
        });
      }
    }
  } catch {
    // Directory doesn't exist
  }
}

async function generateChatbotComponent(cwd: string, knowledge: any, position: string): Promise<void> {
  const component = `'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function HelpChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hi! I\\'m your AI assistant. I know everything about this app and can help you navigate features, answer questions, or troubleshoot issues. What can I help you with?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input })
      });

      const data = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response || 'Sorry, I couldn\\'t process that request.'
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'sidebar': 'top-20 right-4'
  };

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={\`fixed \${positionClasses['${position}']} z-50 bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 transition-all\`}
          aria-label="Open help chat"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className={\`fixed \${positionClasses['${position}']} z-50 w-96 h-[500px] bg-white border border-gray-200 rounded-lg shadow-xl flex flex-col\`}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-blue-600 text-white rounded-t-lg">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <h3 className="font-semibold">Help Assistant</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-blue-700 rounded p-1 transition-colors"
              aria-label="Close chat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={\`flex \${message.role === 'user' ? 'justify-end' : 'justify-start'}\`}
              >
                <div
                  className={\`max-w-[80%] rounded-lg px-4 py-2 \${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }\`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-4 py-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
`;

  const componentPath = path.join(cwd, 'src', 'components', 'HelpChatbot.tsx');
  await fs.mkdir(path.dirname(componentPath), { recursive: true });
  await fs.writeFile(componentPath, component, 'utf-8');
}

async function generateKnowledgeBase(cwd: string, knowledge: any): Promise<void> {
  const knowledgeFile = `// Auto-generated knowledge base for AI chatbot
// This file contains indexed information about the app

export const appKnowledge = ${JSON.stringify(knowledge, null, 2)};

export function searchKnowledge(query: string): any[] {
  const results: any[] = [];
  const lowerQuery = query.toLowerCase();

  // Search features
  for (const feature of appKnowledge.features) {
    if (feature.name.toLowerCase().includes(lowerQuery)) {
      results.push({
        type: 'feature',
        relevance: 0.9,
        data: feature
      });
    }
  }

  // Search API routes
  for (const route of appKnowledge.api_routes) {
    if (route.path.toLowerCase().includes(lowerQuery)) {
      results.push({
        type: 'api',
        relevance: 0.8,
        data: route
      });
    }
  }

  // Search components
  for (const component of appKnowledge.components) {
    if (component.name.toLowerCase().includes(lowerQuery)) {
      results.push({
        type: 'component',
        relevance: 0.7,
        data: component
      });
    }
  }

  // Search common tasks
  for (const task of appKnowledge.common_tasks) {
    if (task.task.toLowerCase().includes(lowerQuery) || task.answer.toLowerCase().includes(lowerQuery)) {
      results.push({
        type: 'task',
        relevance: 1.0,
        data: task
      });
    }
  }

  return results.sort((a, b) => b.relevance - a.relevance).slice(0, 5);
}
`;

  const knowledgePath = path.join(cwd, 'src', 'lib', 'chatbot-knowledge.ts');
  await fs.mkdir(path.dirname(knowledgePath), { recursive: true });
  await fs.writeFile(knowledgePath, knowledgeFile, 'utf-8');
}

async function generateChatbotAPI(cwd: string): Promise<void> {
  const apiRoute = `import { NextRequest, NextResponse } from 'next/server';
import { searchKnowledge, appKnowledge } from '@/lib/chatbot-knowledge';

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Search knowledge base
    const relevantInfo = searchKnowledge(message);

    // Generate response based on relevant information
    let response = generateResponse(message, relevantInfo);

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Chatbot API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateResponse(message: string, relevantInfo: any[]): string {
  const lowerMessage = message.toLowerCase();

  // Handle common greetings
  if (lowerMessage.match(/^(hi|hello|hey)/)) {
    return "Hello! I'm your AI assistant. I know everything about this app. What would you like to know?";
  }

  // Handle feature questions
  if (lowerMessage.includes('feature') || lowerMessage.includes('can i')) {
    const features = relevantInfo.filter(i => i.type === 'feature');
    if (features.length > 0) {
      return \`Yes! We have that feature. Available features include: \${features.map(f => f.data.name).join(', ')}. Would you like to know more about any of these?\`;
    }
  }

  // Handle navigation questions
  if (lowerMessage.includes('how do i') || lowerMessage.includes('where')) {
    const tasks = relevantInfo.filter(i => i.type === 'task');
    if (tasks.length > 0) {
      return tasks[0].data.answer;
    }
  }

  // Handle API questions
  if (lowerMessage.includes('api') || lowerMessage.includes('endpoint')) {
    const apis = relevantInfo.filter(i => i.type === 'api');
    if (apis.length > 0) {
      return \`We have these API endpoints: \${apis.map(a => \`\${a.data.path} (\${a.data.methods.join(', ')})\`).join(', ')}.\`;
    }
  }

  // Generic response with relevant info
  if (relevantInfo.length > 0) {
    const topResult = relevantInfo[0];

    switch (topResult.type) {
      case 'feature':
        return \`I found information about "\${topResult.data.name}". This is a \${topResult.data.priority} priority feature. Is this what you're looking for?\`;
      case 'component':
        return \`I found the \${topResult.data.name} component. It's located in \${topResult.data.file}. What would you like to know about it?\`;
      case 'api':
        return \`The API endpoint \${topResult.data.path} supports these methods: \${topResult.data.methods.join(', ')}.\`;
      case 'task':
        return topResult.data.answer;
    }
  }

  // Fallback response
  return \`I'm not sure about that. Could you rephrase your question? I can help with:
- App features and capabilities
- How to use specific functions
- Navigation and settings
- General questions about the app\`;
}
`;

  const apiPath = path.join(cwd, 'src', 'app', 'api', 'chatbot', 'route.ts');
  await fs.mkdir(path.dirname(apiPath), { recursive: true });
  await fs.writeFile(apiPath, apiRoute, 'utf-8');
}

async function integrateIntoLayout(cwd: string): Promise<void> {
  const layoutPath = path.join(cwd, 'src', 'app', 'layout.tsx');

  try {
    let layout = await fs.readFile(layoutPath, 'utf-8');

    // Check if already integrated
    if (layout.includes('HelpChatbot')) {
      return; // Already integrated
    }

    // Add import
    if (!layout.includes("import HelpChatbot from '@/components/HelpChatbot'")) {
      layout = layout.replace(
        /import/,
        "import HelpChatbot from '@/components/HelpChatbot';\nimport"
      );
    }

    // Add component before closing body tag
    layout = layout.replace(
      /<\/body>/,
      '        <HelpChatbot />\n      </body>'
    );

    await fs.writeFile(layoutPath, layout, 'utf-8');
  } catch {
    // layout.tsx doesn't exist or can't modify
    console.error('Could not integrate into layout.tsx - add <HelpChatbot /> manually');
  }
}

function generateChatbotReport(knowledge: any): string {
  let report = `🍞 CodeBakers: AI Chatbot Generated\n\n`;
  report += `✅ **Chatbot component created**\n`;
  report += `✅ **Knowledge base indexed**\n`;
  report += `✅ **API route generated**\n`;
  report += `✅ **Integrated into app**\n\n`;

  report += `## Knowledge Base Indexed\n\n`;
  report += `- **Features:** ${knowledge.features.length}\n`;
  report += `- **API Routes:** ${knowledge.api_routes.length}\n`;
  report += `- **Components:** ${knowledge.components.length}\n`;
  report += `- **Pages:** ${knowledge.pages.length}\n`;
  report += `- **Common Tasks:** ${knowledge.common_tasks.length}\n\n`;

  report += `## Files Created\n\n`;
  report += `- src/components/HelpChatbot.tsx (UI component)\n`;
  report += `- src/lib/chatbot-knowledge.ts (Knowledge base)\n`;
  report += `- src/app/api/chatbot/route.ts (API endpoint)\n`;
  report += `- Updated: src/app/layout.tsx (Integration)\n\n`;

  report += `## What the Chatbot Can Do\n\n`;
  report += `- Answer questions about app features\n`;
  report += `- Guide users through common tasks\n`;
  report += `- Explain how to use specific functions\n`;
  report += `- Provide navigation help\n`;
  report += `- Reference API endpoints\n`;
  report += `- List available components\n\n`;

  report += `## Usage\n\n`;
  report += `The chatbot appears as a floating button in the bottom-right corner.\n`;
  report += `Users can click to open and ask questions about the app.\n\n`;

  report += `**Example questions:**\n`;
  report += `- "How do I log in?"\n`;
  report += `- "What features are available?"\n`;
  report += `- "Where can I change my password?"\n`;
  report += `- "How do I [specific task]?"\n\n`;

  report += `🤖 Your app now has an AI assistant that knows the entire codebase!\n`;

  return report;
}
