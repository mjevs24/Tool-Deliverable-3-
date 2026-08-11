export interface Question {
  id: string;
  text: string;
  options: string[];
}

export interface PromptBank {
  id: string; // e.g. "A", "B", ...
  name: string; // e.g. "Reconciling New Ideas With Existing Beliefs"
  q3Route: string; // matches the Q3 selected option
  fallbackPrompt: string;
  scenarioPrompts: Record<string, string>; // keys are Q1 scenarios
}

export interface Q2Framing {
  answer: string;
  sentence: string;
}

export const QUESTIONS: Question[] = [
  {
    id: "Q1",
    text: "How are you leaving today’s session?",
    options: [
      "Energized",
      "Excited about innovation",
      "Hopeful about future practice",
      "Curious",
      "Inspired to take action",
      "Skeptical but engaged",
      "Professionally challenged",
      "Unsure where they stand",
      "Conflicted",
      "Ethically concerned",
      "Protective of OT values",
      "Reflecting on professional identity",
      "Overwhelmed",
      "Validated / connected",
      "Disconnected"
    ]
  },
  {
    id: "Q2",
    text: "What stood out most during today’s discussion?",
    options: [
      "A new perspective I had not considered before",
      "A challenge to my existing beliefs",
      "An ethical question or concern",
      "A practical application to practice",
      "Another clinician's experience",
      "A future possibility or opportunity"
    ]
  },
  {
    id: "Q3",
    text: "What feels most relevant to you right now?",
    options: [
      "Making sense of new ideas",
      "My identity and values as an OT",
      "Ethical questions and tensions",
      "Building confidence with uncertainty",
      "Relevance to my own practice",
      "Future possibilities",
      "Learning from others",
      "What I want to do next"
    ]
  }
];

export const Q2_FRAMINGS: Record<string, string> = {
  "A new perspective I had not considered before": "You noted that a new perspective stood out during today's discussion.",
  "A challenge to my existing beliefs": "You noted that part of today's discussion challenged something you previously believed.",
  "An ethical question or concern": "You noted that an ethical question or concern stayed with you.",
  "A practical application to practice": "You noted that a practical application felt particularly relevant today.",
  "Another clinician's experience": "You noted that another clinician's experience stood out to you.",
  "A future possibility or opportunity": "You noted that a future possibility or opportunity caught your attention."
};

export const PROMPT_BANKS: Record<string, PromptBank> = {
  "Making sense of new ideas": {
    id: "A",
    name: "Reconciling New Ideas With Existing Beliefs",
    q3Route: "Making sense of new ideas",
    fallbackPrompt: "What idea, perspective, or assumption from today's discussion feels most worth reflecting on further, and why?",
    scenarioPrompts: {
      "Curious": "What idea, perspective, or question from today's discussion has stayed with you the longest, and what keeps drawing you back to it?",
      "Professionally challenged": "Did today's conversation cause you to reconsider anything about your practice, expertise, or assumptions? What are you noticing as you sit with that possibility?",
      "Conflicted": "Was there a moment during today's discussion where two ideas, values, or perspectives felt difficult to hold at the same time? What feels unresolved for you right now?",
      "Protective of OT values": "Was there a moment today where a new idea felt difficult to accept? What value, belief, or experience do you think contributed to that reaction?"
    }
  },
  "My identity and values as an OT": {
    id: "B",
    name: "Negotiating Professional Identity",
    q3Route: "My identity and values as an OT",
    fallbackPrompt: "As occupational therapy continues to evolve alongside new technologies, what feels most important to you about the role you play as an occupational therapist?",
    scenarioPrompts: {
      "Protective of OT values": "What aspect of today's discussion felt most at odds with your understanding of occupational therapy, and why do you think that reaction emerged?",
      "Reflecting on professional identity": "Did today's discussion cause you to think differently about any aspect of occupational therapy practice or competency? What felt challenged, reinforced, or uncertain?"
    }
  },
  "Ethical questions and tensions": {
    id: "C",
    name: "Navigating Ethical Tension",
    q3Route: "Ethical questions and tensions",
    fallbackPrompt: "What ethical question, concern, or tension from today's discussion feels most important to continue reflecting on?",
    scenarioPrompts: {
      "Skeptical but engaged": "Did today's discussion shift your thinking in any way, even if only slightly? What contributed to that shift - or what prevented it?",
      "Ethically concerned": "Was there a moment today where the potential benefits and risks of technology felt difficult to balance? What tension are you noticing?"
    }
  },
  "Building confidence with uncertainty": {
    id: "D",
    name: "Building Confidence in Uncertainty",
    q3Route: "Building confidence with uncertainty",
    fallbackPrompt: "What feels uncertain or unresolved for you right now, and what might help you stay engaged with that uncertainty?",
    scenarioPrompts: {
      "Curious": "What question are you comfortable leaving unanswered for now, and why does it still feel worth exploring for you?",
      "Unsure where they stand": "What feels unclear or unresolved for you right now, and what might help you continue exploring it without needing an immediate answer?",
      "Conflicted": "Can uncertainty and conflicting perspectives coexist in this conversation? What would it look like to stay engaged without fully resolving the tension?",
      "Overwhelmed": "What feels most important to hold onto from today's discussion, even if everything else feels uncertain or unfinished?"
    }
  },
  "Relevance to my own practice": {
    id: "E",
    name: "Finding Relevance to Practice",
    q3Route: "Relevance to my own practice",
    fallbackPrompt: "What aspect of today's discussion feels most connected - or least connected - to your own professional context, and why?",
    scenarioPrompts: {
      "Reflecting on professional identity": "As occupational therapy continues to evolve alongside new technologies, what aspects of your professional identity feel most certain - and what feels less certain?",
      "Disconnected": "What would need to be different for today's discussion to feel more meaningful or applicable to your own professional practice setting?"
    }
  },
  "Future possibilities": {
    id: "F",
    name: "Imagining Possibilities",
    q3Route: "Future possibilities",
    fallbackPrompt: "What idea, opportunity, or future possibility from today's discussion feels most worth continuing to think about?",
    scenarioPrompts: {
      "Energized": "What idea from today's discussion feels like it opened up a new way of thinking for you?",
      "Excited about innovation": "What aspect of innovation feels most worth paying attention to right now for you, and why?",
      "Hopeful about future practice": "Is there anything that feels more possible now than it did before today's discussion?",
      "Inspired to take action": "What idea feels worth exploring further, even if you're not yet sure where it might lead?"
    }
  },
  "Learning from others": {
    id: "G",
    name: "Recognizing Connection and Shared Experience",
    q3Route: "Learning from others",
    fallbackPrompt: "Did hearing the perspectives or experiences of others influence how you are thinking about this topic? If so, what stayed with you?",
    scenarioPrompts: {
      "Validated / connected": "Was there a moment during today's discussion where you felt understood, validated, or less alone in your thinking? What stood out about that experience?"
    }
  },
  "What I want to do next": {
    id: "H",
    name: "Translating Reflection Into Future Action",
    q3Route: "What I want to do next",
    fallbackPrompt: "As you reflect on today's discussion, what idea, question, or possibility feels most worth carrying forward into your ongoing work?",
    scenarioPrompts: {
      "Inspired to take action": "Has today's discussion highlighted an opportunity, question, or challenge you would like to continue thinking about in relation to your own practice?"
    }
  }
};

export interface RouteResult {
  categoryName: string;
  bankId: string;
  isExactMatch: boolean;
  q2FramingSentence: string;
  promptText: string;
  promptId: string;
}

export function computeReflectionPrompt(
  q1Answer: string,
  q2Answer: string,
  q3Answer: string,
  historyIds: string[] = []
): RouteResult | null {
  if (!q1Answer || !q2Answer || !q3Answer) {
    return null;
  }

  const bank = PROMPT_BANKS[q3Answer];
  if (!bank) {
    return null;
  }

  const q2FramingSentence = Q2_FRAMINGS[q2Answer] || "";

  // 1. Determine the "standard" ideal prompt based on Q1 and Q3 routing
  const scenarioPrompt = bank.scenarioPrompts[q1Answer];
  const standardIsExact = !!scenarioPrompt;
  const standardText = standardIsExact ? scenarioPrompt : bank.fallbackPrompt;
  const standardId = `prompt-${bank.id}-${standardIsExact ? q1Answer.replace(/\s+/g, "_") : "fallback"}`;

  // 2. Map all available candidate prompts in this category/bank
  const candidates = [
    {
      id: `prompt-${bank.id}-fallback`,
      text: bank.fallbackPrompt,
      isExactMatch: false
    },
    ...Object.entries(bank.scenarioPrompts).map(([scenario, text]) => ({
      id: `prompt-${bank.id}-${scenario.replace(/\s+/g, "_")}`,
      text,
      isExactMatch: true
    }))
  ];

  // We want to find the best candidate.
  // Rule:
  // - Prioritize the standard/ideal prompt if it is unused (not in history).
  // - If the standard prompt is already used, check if there are other unused prompts in this bank.
  //   If yes, select the first unused prompt.
  // - If ALL prompts in this bank are already used, begin recycling starting with the oldest previously delivered prompt.
  
  let selectedCandidate = candidates.find(c => c.id === standardId);
  const standardIsUnused = !historyIds.includes(standardId);

  if (standardIsUnused) {
    // Standard prompt is unused.
    selectedCandidate = candidates.find(c => c.id === standardId);
  } else {
    // Standard prompt is already used. Find any unused candidates in this category.
    const unusedCandidates = candidates.filter(c => !historyIds.includes(c.id));
    if (unusedCandidates.length > 0) {
      // Pick the first available unused prompt from this bank.
      selectedCandidate = unusedCandidates[0];
    } else {
      // All candidates have been used! Find the one whose last delivery is the oldest.
      let oldestIndex = Infinity;
      let oldestCandidate = candidates[0];

      for (const candidate of candidates) {
        const lastIndex = historyIds.lastIndexOf(candidate.id);
        if (lastIndex < oldestIndex) {
          oldestIndex = lastIndex;
          oldestCandidate = candidate;
        }
      }
      selectedCandidate = oldestCandidate;
    }
  }

  const finalPrompt = selectedCandidate || { id: standardId, text: standardText, isExactMatch: standardIsExact };

  return {
    categoryName: bank.name,
    bankId: bank.id,
    isExactMatch: finalPrompt.isExactMatch,
    q2FramingSentence,
    promptText: finalPrompt.text,
    promptId: finalPrompt.id
  };
}
