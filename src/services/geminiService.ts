export async function analyzeSkillText(text: string, skillName = 'uploaded-skill') {
  const response = await fetch('/api/parse-skill', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, skillName }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || 'Skill-0 parser bridge request failed');
  }

  return payload;
}
