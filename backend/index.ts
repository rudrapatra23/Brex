import express from 'express';
import { tavily } from '@tavily/core';
import { PROMPT_TEMPLATE, SYSTEM_PROMPT } from './prompt';
import { json, z } from 'zod';
import { Output, streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { groq } from '@ai-sdk/groq';

const client = tavily({ apiKey: process.env.TAVILY_API_KEY });
const app = express();
app.use(express.json());

// List of fallback models across Groq and Gemini
const MODEL_PIPELINE = [
    { name: 'Groq (GPT-OSS 120B)', instance: groq('openai/gpt-oss-120b') },
    { name: 'Gemini (3.5 Flash)', instance: google('gemini-3.5-flash') },
    { name: 'Groq (Llama 3.3 70B)', instance: groq('llama-3.3-70b-versatile') },
    { name: 'Gemini (3.6 Flash)', instance: google('gemini-3.6-flash') },
];

app.post('/brex_ask', async (req, res) => {
    //  step:1 -> get the query from user
    if (!req.body || !req.body.query) {
        return res.status(400).send("Missing query");
    }

    const query = req.body.query;
    //  step: 2 -> make sure user have enough credits to hit the endpoint

    //  step: 3 (TODO) -> check if we have websearch indexed for similiar query

    //  step: 4 -> web search to gather resources
    const webSearchResponse = await client.search(query, {
        searchDepth: "advanced"
    })

    const websearchResult = webSearchResponse.results;

    //  step: 5 -> do some context engineering on the prompt
    const prompt = PROMPT_TEMPLATE.replace('{{WEB_SEARCH_RESULTS}}', JSON.stringify(websearchResult)).replace('{{USER_QUERY}}', query);

    //  step: 6 -> hit the LLM and stream back the response
   let activeStream = null;

    for (const modelConfig of MODEL_PIPELINE) {
        try {
            const candidateStream = streamText({
                model: modelConfig.instance,
                prompt: prompt,
                system: SYSTEM_PROMPT,
                // output: Output.object({
                //     schema: z.object({
                //         schema: z.object({
                //             answer: z.string(),
                //             followUps: z.array(z.string())
                //         })
                //     }),
                // }),
            });

            // Verify the stream gets its first token before consuming it fully
            const reader = candidateStream.textStream[Symbol.asyncIterator]();
            const firstChunk = await reader.next();

            if (!firstChunk.done) {
                res.write(firstChunk.value);

                for await (const textPart of candidateStream.textStream) {
                    // process.stdout.write(textPart);
                    res.write(textPart);
                }
                activeStream = candidateStream;
                break;
            }
        } catch (error) {
            console.warn(`[Fallback Warning] ${modelConfig.name} failed: ${(error as Error).message}`);
        }
    }

    if (!activeStream && !res.headersSent) {
        return res.status(503).send("All AI models are currently busy. Please try again.");
    }
    res.write("\n\nSources\n________\n");
    //  step: 7 -> also stream back the sources and the follow up questions for the user to ask (which we can get from another parallel LLM call)
    res.write( JSON.stringify(websearchResult.map(result =>({url: result.url}))));
    // step: 8 -> close the event stream
    res.end();
});

app.listen(3000)