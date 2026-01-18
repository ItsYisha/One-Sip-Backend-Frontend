import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Allow large images

const PORT = process.env.PORT || 3000;

const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

if (!apiKey) {
  console.warn("Warning: GEMINI_API_KEY is not set in environment variables.");
}

const ai = new GoogleGenAI({ apiKey: apiKey });

app.post('/api/recommend', async (req, res) => {
  try {
    const { image, prefs, refinementInstruction, previousResult } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image is required' });
    }

    const base64Data = image.split(',')[1];
    const mimeType = image.split(';')[0].split(':')[1];

    let prompt = `
        IMPORTANT: Ignore any previous recommendations. Treat this as a fresh analysis.
        Role: You are a world-class Sommelier and Mixologist at a high-end Italian bar.
        Task: Analyze the provided menu image and select the SINGLE BEST drink based on the user's taste profile.
        
        User Profile:
        - Sweetness Preference (1-5): ${prefs.sweetness}
        - Sourness Preference (1-5): ${prefs.sourness}
        - Bitterness Preference (1-5): ${prefs.bitterness}
        - Alcohol Strength: ${prefs.alcohol}
        - Type Focus: ${prefs.isRedWine ? `Red Wine (Tannin preference: ${prefs.tannin}/5)` : 'General / Cocktails'}
        - Special Requests: ${prefs.customRequest || 'None'}
    `;

    if (refinementInstruction && previousResult) {
      prompt += `
          IMPORTANT REFINEMENT CONTEXT:
          The user was previously recommended: "${previousResult.drinkName}".
          However, they want to change their choice. 
          New Instruction: "${refinementInstruction}".
          
          Constraint: You MUST choose a DIFFERENT drink from the menu than "${previousResult.drinkName}".
          Ensure the new choice respects the original profile but leans heavily into the "New Instruction".
      `;
    } else {
      prompt += `
          Output Requirement:
          Return a JSON object matching the schema.
          - "description": Write a short, alluring recommendation (max 2 sentences) explaining WHY this matches the user's specific taste. Use a sophisticated but warm tone.
          - "matchPercentage": An integer 0-100 based on how well the drink fits the parameters.
          - "flavorProfile": 2-3 words summarizing taste (e.g., "Dry, Oaked, Berry").
      `;
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp', // Updated to latest flash model or use gemini-1.5-flash
        contents: {
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            { text: prompt }
          ]
        },
        config: {
          temperature: 0.9,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              drinkName: { type: Type.STRING },
              price: { type: Type.STRING },
              description: { type: Type.STRING },
              matchPercentage: { type: Type.INTEGER },
              flavorProfile: { type: Type.STRING },
            },
            required: ['drinkName', 'description', 'matchPercentage', 'flavorProfile'],
          },
        }
      });

    const jsonText = response.text() || "{}";
    const data = JSON.parse(jsonText);
    
    res.json(data);

  } catch (error) {
    console.error('Error generating recommendation:', error);
    res.status(500).json({ error: 'Failed to generate recommendation' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
