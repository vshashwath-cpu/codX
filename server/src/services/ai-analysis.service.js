import env from '../config/env.js';
import { insertRecord } from '../storage/json-store.js';

/**
 * Analyze a resume using OpenRouter AI.
 * @param {string} resumeText - Extracted text from resume
 * @param {string} jobDescription - Optional target job description
 * @returns {Promise<Object>} Structured analysis result
 */
export async function analyzeResume(resumeText, jobDescription = '') {
  if (!env.OPENROUTER_API_KEY) {
    throw Object.assign(
      new Error('OpenRouter API key is not configured. Please set OPENROUTER_API_KEY in your .env file.'),
      { status: 503 }
    );
  }

  if (!resumeText || resumeText.trim().length < 50) {
    throw Object.assign(
      new Error('Resume text is too short or empty to analyze. Please provide a more complete resume.'),
      { status: 400 }
    );
  }

  // Truncate inputs to prevent excessive token usage
  const maxResumeLen = 8000;
  const maxJdLen = 3000;
  const truncatedResume = resumeText.slice(0, maxResumeLen);
  const truncatedJd = jobDescription ? jobDescription.slice(0, maxJdLen) : '';

  const systemPrompt = `You are an expert technical recruiter and resume reviewer for college placements.
Analyze the provided resume and return ONLY a valid JSON object (no markdown, no code blocks, no other text).

The JSON must follow this exact structure:
{
  "score": <number between 40 and 95>,
  "strengths": [<3-5 specific strengths>],
  "weaknesses": [<2-4 areas needing improvement>],
  "missingSkills": [<3-6 relevant skills that would strengthen the profile>],
  "projectSuggestions": [<2-3 actionable ways to improve project descriptions>],
  "formattingFeedback": [<2-3 formatting/readability tips>],
  "keywordGaps": [<3-5 industry keywords missing from the resume>],
  "recommendations": [<3-5 prioritized next steps for the student>]
}`;

  let userPrompt = `Here is the candidate's resume:\n\n${truncatedResume}`;
  if (truncatedJd) {
    userPrompt += `\n\nTarget Job Description:\n${truncatedJd}\n\nTailor the analysis specifically against this job description.`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000); // 35s timeout

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'College Placement Guide',
      },
      body: JSON.stringify({
        model: env.OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMsg = `OpenRouter API error: ${response.status}`;
      try {
        const errJson = JSON.parse(errorBody);
        errorMsg = errJson.error?.message || errorMsg;
      } catch { /* ignore */ }

      if (response.status === 401) {
        throw Object.assign(new Error('Invalid OpenRouter API key. Please check your credentials.'), { status: 401 });
      }
      if (response.status === 429) {
        throw Object.assign(new Error('Rate limit exceeded on OpenRouter. Please try again later.'), { status: 429 });
      }
      if (response.status === 402) {
        throw Object.assign(new Error('Insufficient OpenRouter credits. Please add credits to your account.'), { status: 402 });
      }

      throw Object.assign(new Error(errorMsg), { status: 502 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw Object.assign(new Error('Empty response from AI model'), { status: 502 });
    }

    // Clean potential markdown wrapper
    let cleaned = content.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    let analysis;
    try {
      analysis = JSON.parse(cleaned);
    } catch {
      throw Object.assign(new Error('AI model returned an invalid JSON response. Please try again.'), { status: 502 });
    }

    // Validate required fields
    analysis.score = Math.min(100, Math.max(0, parseInt(analysis.score, 10) || 65));
    analysis.strengths = Array.isArray(analysis.strengths) ? analysis.strengths : [];
    analysis.weaknesses = Array.isArray(analysis.weaknesses) ? analysis.weaknesses : [];
    analysis.missingSkills = Array.isArray(analysis.missingSkills) ? analysis.missingSkills : [];
    analysis.projectSuggestions = Array.isArray(analysis.projectSuggestions) ? analysis.projectSuggestions : [];
    analysis.formattingFeedback = Array.isArray(analysis.formattingFeedback) ? analysis.formattingFeedback : [];
    analysis.keywordGaps = Array.isArray(analysis.keywordGaps) ? analysis.keywordGaps : [];
    analysis.recommendations = Array.isArray(analysis.recommendations) ? analysis.recommendations : [];

    // Add disclaimer
    analysis.disclaimer = 'This score and feedback are AI-generated estimates to help you improve your resume. They do not guarantee selection or represent an official evaluation.';

    // Store in resume-analyses collection
    try {
      await insertRecord('resume-analyses', {
        score: analysis.score,
        targetJdProvided: Boolean(truncatedJd),
        createdAt: new Date().toISOString(),
      });
    } catch { /* non-critical */ }

    return analysis;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw Object.assign(new Error('AI analysis request timed out. Please try again.'), { status: 504 });
    }
    throw err;
  }
}

export default { analyzeResume };
