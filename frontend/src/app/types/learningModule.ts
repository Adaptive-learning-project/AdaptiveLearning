export interface InteractiveStep {
  title: string;
  instruction: string;
  emoji?: string;
  image?: string;
  audio?: string;
  audioText?: string;
  action?: string;
  choices?: string[];
  correctChoice?: string;
}

export interface LearningModule {
  _id?: string;

  moduleId: string;

  title: string;

  description: string;

  category: string;

  skill: string;

  level: "Beginner" | "Intermediate" | "Advanced" | string;

  duration: number;

  ageGroups: string[];

  objectives: string[];

  steps: string[];

  adaptations: string[];

  activityType?: string;

  interactiveSteps?: InteractiveStep[];

  coverImage?: string;

  coverEmoji?: string;

  audioEnabled?: boolean;

  icon: string;

  color: string;

  status?: string;
}