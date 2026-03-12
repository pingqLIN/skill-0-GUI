import { GoogleGenAI, Type } from "@google/genai";
import { AdvancedSkillAnalyzer, RiskLevel } from "./skillScanner";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY
});

export async function analyzeSkillText(text: string) {
  const scanner = new AdvancedSkillAnalyzer();
  const scanResult = scanner.scanContent(text);

  const prompt = `
    Analyze the following skill description or code snippet based on the Skill-0 project framework.
    Extract the goals, constraints, and evaluate its operability and execution phases.
    
    Skill Input:
    """
    ${text}
    """
    
    Provide a detailed JSON response matching the required schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            projectId: { type: Type.STRING, description: "A generated unique ID for this skill, e.g., SKILL-0-XXXX" },
            projectName: { type: Type.STRING, description: "A concise, descriptive name for the skill" },
            threeClassification: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING, description: "The broad category of the skill (e.g., Data Processing, Automation, Communication)" },
                granularity: { type: Type.STRING, description: "The granularity level: Atomic, Composite, or Complex" },
                operability: { type: Type.INTEGER, description: "Operability score from 0 to 100" }
              },
              required: ["category", "granularity", "operability"]
            },
            globalMetrics: {
              type: Type.OBJECT,
              properties: {
                deliveryTime: { type: Type.NUMBER, description: "Estimated delivery time in hours" },
                decisionConfidence: { type: Type.INTEGER, description: "Confidence score of the analysis (0-100)" },
                reworkRate: { type: Type.INTEGER, description: "Estimated rework rate percentage (0-100)" },
                goalAchievementRate: { type: Type.INTEGER, description: "Estimated goal achievement rate percentage (0-100)" }
              },
              required: ["deliveryTime", "decisionConfidence", "reworkRate", "goalAchievementRate"]
            },
            phases: {
              type: Type.ARRAY,
              description: "The 6 execution phases (A to F) of the Skill-0 framework",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "Phase ID (A, B, C, D, E, F)" },
                  name: { type: Type.STRING, description: "Phase Name" },
                  input: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of inputs for this phase" },
                  output: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of outputs for this phase" },
                  tasks: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of tasks performed in this phase" },
                  decisionNodes: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING, description: "Node ID (e.g., A1)" },
                        question: { type: Type.STRING, description: "The decision question" },
                        rules: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Rules evaluated" },
                        threshold: { type: Type.STRING, description: "The threshold for the decision" },
                        outcomes: {
                          type: Type.OBJECT,
                          properties: {
                            yes: { type: Type.STRING },
                            no: { type: Type.STRING }
                          },
                          required: ["yes", "no"]
                        },
                        evidence: { type: Type.STRING, description: "Traceability evidence for this decision based on the input text" }
                      },
                      required: ["id", "question", "rules", "threshold", "outcomes", "evidence"]
                    }
                  }
                },
                required: ["id", "name", "input", "output", "tasks", "decisionNodes"]
              }
            }
          },
          required: ["projectId", "projectName", "threeClassification", "globalMetrics", "phases"]
        }
      }
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);
      
      // Inject deterministic risk assessment from our scanner
      parsed.riskAssessment = {
        level: scanResult.riskLevel.toUpperCase(),
        negativeIntent: scanResult.riskScore,
        details: `Found ${scanResult.findings.length} security issues. ${scanResult.blocked ? 'BLOCKED: ' + scanResult.blockedReason : ''}`
      };
      parsed.securityScan = scanResult;
      
      return parsed;
    }
    throw new Error("No response from AI");
  } catch (error) {
    console.error("Error analyzing skill:", error);
    throw error;
  }
}
