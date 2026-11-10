import { NextResponse } from 'next/server';
import { mastra } from '@/mastra/index';
import z from 'zod';
import { RequestContext } from '@mastra/core/request-context';
import { ChatBlogSchema, ChatResponseSchema, type ChatBlog } from '@/@types/Chat.types';
import { getCurrentBlogSkills, isCurrentBlogSkillsQuestion } from '@/mastra/tools/current-blog-skills';
import { getPortfolioSkills, isPortfolioSkillsListQuestion } from '@/mastra/tools/portfolio-skills';
import { getCertificationIssueDate, isCertificationIssueDateQuestion } from '@/mastra/tools/certification-issue-date';
import { getCapabilitySkillName, getSkillCapabilities } from '@/mastra/tools/skill-capabilities';
import { getChatSettings } from '@/libs/chat-settings';

const PromptSchema = z.object({
  prompt: z.string().trim().min(1),
  pathname: z.string().max(2048).regex(/^\/(?!\/)/).optional(),
});
const BlogToolResultSchema = z.object({
  success: z.boolean(),
  blogs: z.array(ChatBlogSchema),
  answer: z.string().trim().min(1).optional(),
  matches: z.array(z.string()).default([]),
});

function getProviderStatus(error: unknown): number | undefined {
  const visited = new Set<object>();
  while (typeof error === 'object' && error !== null && !visited.has(error)) {
    visited.add(error);
    if ('statusCode' in error && typeof error.statusCode === 'number') return error.statusCode;
    if ('status' in error && typeof error.status === 'number') return error.status;
    if ('code' in error && typeof error.code === 'number') return error.code;
    error = 'lastError' in error ? error.lastError : 'cause' in error ? error.cause : undefined;
  }
}

const providerErrors: Partial<Record<number, { status: number; error: string }>> = {
  400: { status: 502, error: 'The AI provider rejected the model request. Check the model and generation settings in Chatbot Settings.' },
  401: { status: 503, error: 'The AI provider rejected the API key. Update the key in Chatbot Settings.' },
  403: { status: 503, error: 'The AI provider denied access. Check the API key and model access in Chatbot Settings.' },
  404: { status: 503, error: 'The configured AI model is unavailable. Choose a supported model in Chatbot Settings.' },
  429: { status: 429, error: 'The AI provider rate limit or quota has been reached. Try again later or check provider billing and quota.' },
  503: { status: 503, error: 'The AI model is experiencing high traffic. Please try again shortly.' },
};

export async function POST(req: Request) {
  try {
    const input = PromptSchema.safeParse(await req.json());
    if (!input.success) {
      return NextResponse.json({ success: false, error: 'Provide a nonempty prompt and, optionally, a valid page path' }, { status: 400 });
    }
    const settings = await getChatSettings();
    if (!settings.chatEnabled) {
      return NextResponse.json({ success: false, error: 'The chatbot is disabled.' }, { status: 403 });
    }
    const requestContext = new RequestContext();
    requestContext.set('userPrompt', input.data.prompt);
    const currentBlogSlug = /^\/blogs\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/.exec(input.data.pathname ?? '')?.[1];
    if (currentBlogSlug) requestContext.set('currentBlogSlug', currentBlogSlug);
    const capabilitySkill = getCapabilitySkillName(input.data.prompt);
    if (capabilitySkill) {
      return NextResponse.json(ChatResponseSchema.parse({
        success: true,
        text: await getSkillCapabilities(capabilitySkill),
        blogs: [],
      }));
    }
    if (isCertificationIssueDateQuestion(input.data.prompt)) {
      return NextResponse.json(ChatResponseSchema.parse({
        success: true,
        text: await getCertificationIssueDate(input.data.prompt),
        blogs: [],
      }));
    }
    if (isCurrentBlogSkillsQuestion(input.data.prompt)) {
      return NextResponse.json(ChatResponseSchema.parse({
        success: true,
        text: await getCurrentBlogSkills(currentBlogSlug),
        blogs: [],
      }));
    }
    if (isPortfolioSkillsListQuestion(input.data.prompt)) {
      return NextResponse.json(ChatResponseSchema.parse({
        success: true,
        text: await getPortfolioSkills(),
        blogs: [],
      }));
    }

    const agent = mastra.getAgentById('rag-agent');
    const response = await agent.generate(input.data.prompt, {
      requestContext,
      modelSettings: { temperature: settings.temperature, maxOutputTokens: settings.maxOutputTokens },
    });
    const blogsById = new Map<string, ChatBlog>();
    let exactAnswer: string | undefined;
    let hasRetrievedContext = false;
    for (const { payload } of response.toolResults) {
      if (payload.toolName !== 'customVectorQueryTool' || payload.isError) continue;
      const result = BlogToolResultSchema.parse(payload.result);
      if (result.success) {
        if (result.matches.some(match => match.trim().length > 0)) hasRetrievedContext = true;
        if (result.answer) exactAnswer = result.answer;
        for (const blog of result.blogs) blogsById.set(blog._id, blog);
      }
    }
    return NextResponse.json(ChatResponseSchema.parse({
      success: true,
      text: exactAnswer ?? (hasRetrievedContext ? response.text : 'I could not find that information in the database.'),
      blogs: exactAnswer ? [] : [...blogsById.values()],
    }));
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    }
    const providerStatus = getProviderStatus(error);
    console.error('Chat response error:', { providerStatus: providerStatus ?? 'unknown' });
    const failure = providerStatus === undefined ? undefined : providerErrors[providerStatus];
    if (failure) {
      return NextResponse.json({ success: false, error: failure.error }, { status: failure.status });
    }

    return NextResponse.json({ success: false, error: 'Failed to generate chat response. Check the server configuration and try again.' }, { status: 500 });
  }
}