import { OpenAI } from 'openai';

const client = new OpenAI();

const response = await client.responses.create({
    model: "gpt-4.1-mini",
    input: "Write a one-sentence motivational story",
});

console.log(response.output_text);