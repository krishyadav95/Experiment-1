const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001';

function hasOpenRouterApiKey() {
  const key = String(process.env.OPENROUTER_API_KEY || '').trim();
  return key && key !== 'your-openrouter-api-key';
}

function getAiStatus() {
  return {
    connected: Boolean(hasOpenRouterApiKey()),
    model: OPENROUTER_MODEL
  };
}

function reportFallback(user) {
  return {
    summary: `Based on your profile, ${user.name}, your best path is steady progress through small, repeatable habits that fit naturally into your routine.`,
    bmi_info: {
      value: 'N/A',
      category: 'N/A',
      note: 'Add complete height and weight details to unlock BMI-based guidance.'
    },
    score: {
      overall: 70,
      hydration: 62,
      nutrition: 71,
      movement: 68,
      sleep: 69,
      stress: 66
    },
    sections: [
      {
        id: 'hydration',
        title: 'Hydration Plan',
        icon: '💧',
        color: '#00D9A7',
        priority: 8,
        summary: 'Your hydration habits can improve with visible cues and repeated timing anchors.',
        recommendations: [
          {
            title: 'Wake-Up Water',
            description: 'Keep water next to your bed and finish one glass before coffee or your phone.',
            when: 'Immediately after waking',
            effort: 'Easy',
            impact: 'High'
          },
          {
            title: 'Meal Pairing',
            description: 'Pair one glass of water with each meal so hydration becomes automatic.',
            when: 'Breakfast, lunch, and dinner',
            effort: 'Easy',
            impact: 'High'
          },
          {
            title: 'Desk Bottle',
            description: 'Keep a marked bottle within reach during work and aim to finish half by noon.',
            when: 'During work hours',
            effort: 'Easy',
            impact: 'Medium'
          }
        ]
      },
      {
        id: 'nutrition',
        title: 'Nutrition Strategy',
        icon: '🥗',
        color: '#6C63FF',
        priority: 7,
        summary: 'You do not need a rigid diet. A few reliable food upgrades will make the biggest difference.',
        recommendations: [
          {
            title: 'Protein Upgrade',
            description: 'Add one protein-rich item to breakfast to improve fullness and energy stability.',
            when: 'Morning routine',
            effort: 'Easy',
            impact: 'High'
          },
          {
            title: 'Vegetable First',
            description: 'Start lunch or dinner with vegetables before the rest of the plate.',
            when: 'Main meals',
            effort: 'Easy',
            impact: 'Medium'
          },
          {
            title: 'Smarter Snacks',
            description: 'Pre-position fruit, yogurt, nuts, or other simple whole-food snacks where you can see them.',
            when: 'Weekly prep',
            effort: 'Easy',
            impact: 'Medium'
          }
        ]
      },
      {
        id: 'movement',
        title: 'Movement Integration',
        icon: '🏃',
        color: '#F59E0B',
        priority: 7,
        summary: 'Movement should show up as short bursts in your day, not as an all-or-nothing plan.',
        recommendations: [
          {
            title: 'Hourly Reset',
            description: 'Stand, stretch, or walk briefly once per hour to reduce sedentary load.',
            when: 'Every hour of focused work',
            effort: 'Easy',
            impact: 'High'
          },
          {
            title: 'Post-Meal Walk',
            description: 'Take a short walk after dinner to improve digestion and evening energy balance.',
            when: 'After dinner',
            effort: 'Easy',
            impact: 'High'
          },
          {
            title: 'Phone Call Steps',
            description: 'Use one call a day as a walking call to add steps without needing extra time.',
            when: 'During calls',
            effort: 'Easy',
            impact: 'Medium'
          }
        ]
      },
      {
        id: 'sleep',
        title: 'Sleep Optimization',
        icon: '😴',
        color: '#8B80FF',
        priority: 6,
        summary: 'Consistent cues around bedtime and wake time can improve sleep quality quickly.',
        recommendations: [
          {
            title: 'Digital Wind-Down',
            description: 'Keep the last 30 minutes before sleep lower-stimulation and screen-light.',
            when: '30 minutes before bed',
            effort: 'Medium',
            impact: 'High'
          },
          {
            title: 'Stable Wake Time',
            description: 'Use a consistent wake time across weekdays and weekends when possible.',
            when: 'Every morning',
            effort: 'Medium',
            impact: 'High'
          },
          {
            title: 'Cooler Sleep Setup',
            description: 'A slightly cooler, darker room supports deeper sleep and easier onset.',
            when: 'At bedtime',
            effort: 'Easy',
            impact: 'Medium'
          }
        ]
      },
      {
        id: 'habits',
        title: 'Habit Stacking Guide',
        icon: '🔗',
        color: '#EC4899',
        priority: 8,
        summary: 'Your strongest improvements will come from attaching new habits to actions you already do.',
        recommendations: [
          {
            title: 'Coffee Then Water',
            description: 'Before your first coffee sip, drink a full glass of water.',
            when: 'Morning',
            effort: 'Easy',
            impact: 'High'
          },
          {
            title: 'Lunch Then Walk',
            description: 'After lunch, take a short walk before sitting down again.',
            when: 'Midday',
            effort: 'Easy',
            impact: 'High'
          },
          {
            title: 'Brush Then Stretch',
            description: 'Pair evening brushing with 30 to 60 seconds of light stretching.',
            when: 'Bedtime routine',
            effort: 'Easy',
            impact: 'Medium'
          }
        ]
      }
    ],
    action_plan: [
      { week: 1, focus: 'Hydration consistency', action: 'Drink one glass of water on waking and one with each meal.' },
      { week: 2, focus: 'Movement breaks', action: 'Add brief hourly movement resets on workdays.' },
      { week: 3, focus: 'Nutrition quality', action: 'Upgrade breakfast protein and add vegetables to one daily meal.' },
      { week: 4, focus: 'Sleep rhythm', action: 'Establish a 30-minute wind-down and a more stable wake time.' }
    ],
    motivational_note: `${user.name}, this plan is built to work with your life instead of fighting it. Consistency with small actions will compound faster than perfection ever will.`
  };
}

function chatFallback(user, message) {
  const name = user.name.split(' ')[0] || 'there';
  const lower = String(message || '').toLowerCase();

  if (lower.includes('sleep')) {
    return `Sleep tends to improve fastest when you stabilize wake time and reduce stimulation before bed, ${name}. Start with a 30-minute screen-light wind-down and keep your wake time steady for a week.`;
  }

  if (lower.includes('water') || lower.includes('hydr')) {
    return `A simple hydration structure works well: one glass on waking, one with each meal, and one during your afternoon work block, ${name}. That gives you consistency without relying on memory alone.`;
  }

  if (lower.includes('stress')) {
    return `For stress, focus on short interventions you can repeat: slow breathing, a 5-minute walk after intense work, and a clean break between work and evening time. Small resets done daily beat occasional big efforts.`;
  }

  if (lower.includes('food') || lower.includes('diet') || lower.includes('nutrition') || lower.includes('meal')) {
    return `For food, ${name}, start with one meal you already eat often and make it steadier: add protein, add fruit or vegetables, and keep the timing realistic for your day.`;
  }

  if (lower.includes('move') || lower.includes('exercise') || lower.includes('workout') || lower.includes('walk')) {
    return `For movement, ${name}, choose a small repeatable anchor first: a short walk after one meal, a few minutes of stretching after waking, or standing up between work blocks.`;
  }

  return `I can help with that, ${name}, but I am running in offline fallback mode right now, so my answer may be limited. Try asking with a little more context, like your goal, routine, and what you have already tried.`;
}

function missingOpenRouterKeyMessage() {
  return 'Vita is not connected to OpenRouter yet. Add OPENROUTER_API_KEY to your .env file, restart the server, and I will answer with live AI instead of fallback replies.';
}

function safeString(value, fallback = 'not specified') {
  if (value == null || value === '') return fallback;
  if (Array.isArray(value)) return value.join(', ') || fallback;
  return String(value);
}

function buildReportPrompt(user, profile) {
  const bmi =
    profile.height && profile.weight
      ? (Number(profile.weight) / ((Number(profile.height) / 100) ** 2)).toFixed(1)
      : 'N/A';

  return `
You are Vita, an expert wellness coach for Fitnessify AI.
Create a personalized wellness report for this user.

Rules:
- Return strict JSON only.
- Do not wrap the JSON in markdown.
- Do not include comments.
- Do not include trailing commas.
- All numeric scores must be integers from 0 to 100.
- Recommendations must focus on small habits that fit into the user's existing routine.
- Avoid rigid workout plans, medical diagnosis, or unsafe claims.

User profile:
- Name: ${safeString(user.name)}
- Age: ${safeString(profile.age)}
- Gender: ${safeString(profile.gender)}
- Height (cm): ${safeString(profile.height)}
- Weight (kg): ${safeString(profile.weight)}
- BMI: ${bmi}
- City: ${safeString(profile.city)}
- Goals: ${safeString(profile.goals, 'general wellness')}
- Activity level: ${safeString(profile.activityLevel, 'moderate')}
- Work type: ${safeString(profile.workType, 'desk job')}
- Work hours: ${safeString(profile.workHours)}
- Wake time: ${safeString(profile.wakeTime, '07:00')}
- Sleep time: ${safeString(profile.sleepTime, '23:00')}
- Sleep quality: ${safeString(profile.sleepQuality)}
- Sleep issues: ${safeString(profile.sleepIssues, 'none')}
- Diet type: ${safeString(profile.dietType, 'omnivore')}
- Meal times: ${safeString(profile.mealTimes)}
- Allergies: ${safeString(profile.allergies, 'none')}
- Junk food frequency: ${safeString(profile.junkFrequency)}
- Morning routine: ${safeString(profile.morningRoutine)}
- Evening routine: ${safeString(profile.eveningRoutine)}
- Transport: ${safeString(profile.transport)}
- Stress level: ${safeString(profile.stressLevel)}
- Stress sources: ${safeString(profile.stressSources, 'none')}
- Hobbies: ${safeString(profile.hobbies)}
- Wellness practices: ${safeString(profile.practices, 'none')}
- Water intake: ${safeString(profile.waterIntake)}
- Water habits: ${safeString(profile.waterHabits, 'none')}
- Daily drinks: ${safeString(profile.dailyDrinks)}
- Latest check-in energy: ${safeString(profile.checkInEnergy)}
- Latest check-in focus: ${safeString(profile.checkInFocus)}
- Latest check-in note: ${safeString(profile.checkInNote)}
- Latest check-in snapshot: ${safeString(
    profile.lastCheckInSummary ? JSON.stringify(profile.lastCheckInSummary) : '',
    'none'
  )}

Return this exact JSON shape:
{
  "summary": "string",
  "bmi_info": {
    "value": "string",
    "category": "string",
    "note": "string"
  },
  "score": {
    "overall": 0,
    "hydration": 0,
    "nutrition": 0,
    "movement": 0,
    "sleep": 0,
    "stress": 0
  },
  "sections": [
    {
      "id": "hydration",
      "title": "Hydration Plan",
      "icon": "💧",
      "color": "#00D9A7",
      "priority": 0,
      "summary": "string",
      "recommendations": [
        {
          "title": "string",
          "description": "string",
          "when": "string",
          "effort": "Easy",
          "impact": "High"
        }
      ]
    },
    {
      "id": "nutrition",
      "title": "Nutrition Strategy",
      "icon": "🥗",
      "color": "#6C63FF",
      "priority": 0,
      "summary": "string",
      "recommendations": []
    },
    {
      "id": "movement",
      "title": "Movement Integration",
      "icon": "🏃",
      "color": "#F59E0B",
      "priority": 0,
      "summary": "string",
      "recommendations": []
    },
    {
      "id": "sleep",
      "title": "Sleep Optimization",
      "icon": "😴",
      "color": "#8B80FF",
      "priority": 0,
      "summary": "string",
      "recommendations": []
    },
    {
      "id": "habits",
      "title": "Habit Stacking Guide",
      "icon": "🔗",
      "color": "#EC4899",
      "priority": 0,
      "summary": "string",
      "recommendations": []
    }
  ],
  "action_plan": [
    { "week": 1, "focus": "string", "action": "string" },
    { "week": 2, "focus": "string", "action": "string" },
    { "week": 3, "focus": "string", "action": "string" },
    { "week": 4, "focus": "string", "action": "string" }
  ],
  "motivational_note": "string"
}`.trim();
}

function buildChatContext(user, profile, messages) {
  const convo = messages
    .map((message) => `${message.role === 'assistant' ? 'Vita' : 'User'}: ${message.content}`)
    .join('\n');

  return `
You are Vita, a warm and practical wellness coach for Fitnessify AI.

Rules:
- Keep replies concise, useful, and personalized.
- Use the user's existing routine instead of suggesting disruptive overhauls.
- Do not provide medical diagnosis.
- If the user describes symptoms or medical danger, recommend a healthcare professional.

User profile:
- Name: ${safeString(user.name)}
- Goals: ${safeString(profile.goals, 'general wellness')}
- Activity level: ${safeString(profile.activityLevel, 'moderate')}
- Diet: ${safeString(profile.dietType, 'omnivore')}
- Allergies: ${safeString(profile.allergies, 'none')}
- Sleep: ${safeString(profile.wakeTime, '07:00')} to ${safeString(profile.sleepTime, '23:00')}
- Stress level: ${safeString(profile.stressLevel, '5')}
- Water intake: ${safeString(profile.waterIntake, 'not specified')}

Conversation:
${convo}

Reply as Vita to the latest user message only.`.trim();
}

async function callOpenRouter(prompt) {
  if (!hasOpenRouterApiKey()) {
    throw new Error('Missing OPENROUTER_API_KEY.');
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
      'X-Title': 'Fitnessify AI'
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 4096
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `OpenRouter API error (${response.status})`);
  }

  const payload = await response.json();
  return payload.choices?.[0]?.message?.content || '';
}

function extractJson(text) {
  const trimmed = String(text || '').trim().replace(/```json|```/g, '').trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Model response did not contain valid JSON.');
  }

  return JSON.parse(trimmed.slice(start, end + 1));
}

function clampScore(value, fallback = 70) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function normalizeReport(data, user) {
  const fallback = reportFallback(user);
  const source = data && typeof data === 'object' ? data : fallback;
  const fallbackSections = Object.fromEntries(fallback.sections.map((section) => [section.id, section]));

  return {
    summary: safeString(source.summary, fallback.summary),
    bmi_info: {
      value: safeString(source.bmi_info?.value, fallback.bmi_info.value),
      category: safeString(source.bmi_info?.category, fallback.bmi_info.category),
      note: safeString(source.bmi_info?.note, fallback.bmi_info.note)
    },
    score: {
      overall: clampScore(source.score?.overall, fallback.score.overall),
      hydration: clampScore(source.score?.hydration, fallback.score.hydration),
      nutrition: clampScore(source.score?.nutrition, fallback.score.nutrition),
      movement: clampScore(source.score?.movement, fallback.score.movement),
      sleep: clampScore(source.score?.sleep, fallback.score.sleep),
      stress: clampScore(source.score?.stress, fallback.score.stress)
    },
    sections: ['hydration', 'nutrition', 'movement', 'sleep', 'habits'].map((id) => {
      const candidate =
        Array.isArray(source.sections) && source.sections.find((section) => section.id === id);
      const base = fallbackSections[id];

      return {
        id,
        title: safeString(candidate?.title, base.title),
        icon: safeString(candidate?.icon, base.icon),
        color: safeString(candidate?.color, base.color),
        priority: clampScore(candidate?.priority, base.priority),
        summary: safeString(candidate?.summary, base.summary),
        recommendations: (Array.isArray(candidate?.recommendations) ? candidate.recommendations : base.recommendations)
          .slice(0, 4)
          .map((rec, index) => ({
            title: safeString(rec?.title, `${base.title} Recommendation ${index + 1}`),
            description: safeString(rec?.description, base.recommendations[index % base.recommendations.length].description),
            when: safeString(rec?.when, base.recommendations[index % base.recommendations.length].when),
            effort: safeString(rec?.effort, 'Easy'),
            impact: safeString(rec?.impact, 'High')
          }))
      };
    }),
    action_plan: (Array.isArray(source.action_plan) ? source.action_plan : fallback.action_plan)
      .slice(0, 4)
      .map((item, index) => ({
        week: index + 1,
        focus: safeString(item?.focus, fallback.action_plan[index].focus),
        action: safeString(item?.action, fallback.action_plan[index].action)
      })),
    motivational_note: safeString(source.motivational_note, fallback.motivational_note)
  };
}

async function generateReport(user) {
  const profile = user.profile || {};

  if (!hasOpenRouterApiKey()) {
    return reportFallback(user);
  }

  try {
    const raw = await callOpenRouter(buildReportPrompt(user, profile));
    return normalizeReport(extractJson(raw), user);
  } catch (error) {
    console.error('OpenRouter report generation failed:', error);
    return reportFallback(user);
  }
}

async function generateChatReply(user, messages) {
  const latestMessage = messages[messages.length - 1]?.content || '';

  if (!hasOpenRouterApiKey()) {
    return missingOpenRouterKeyMessage();
  }

  try {
    return (await callOpenRouter(buildChatContext(user, user.profile || {}, messages))).trim() || chatFallback(user, latestMessage);
  } catch (error) {
    console.error('OpenRouter chat failed:', error);
    return chatFallback(user, latestMessage);
  }
}

module.exports = {
  getAiStatus,
  generateReport,
  generateChatReply
};
