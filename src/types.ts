export interface Description {
  markdownBody?: string;
  htmlBody?: string;
}

export interface User {
  id: string;
  name: string;
  email?: string;
}

export interface WorkflowStatus {
  id: string;
  name: string;
  color?: string;
  position?: number;
}

export interface Release {
  id: string;
  referenceNum: string;
  name: string;
  releaseDate?: string;
  startOn?: string;
  developmentStartedOn?: string;
  customFieldValues?: CustomFieldValue[];
}

export interface Team {
  id: string;
  name: string;
}

export interface Project {
  id: string;
  referencePrefix?: string;
  name: string;
}

export interface Initiative {
  id: string;
  referenceNum: string;
  name: string;
}

export interface Epic {
  id: string;
  referenceNum: string;
  name: string;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
}

export interface Estimate {
  text?: string;
  value?: number;
  units?: string;
}

export interface CustomFieldValue {
  key: string;
  value: any;
}

export interface RequirementSummary {
  id: string;
  referenceNum: string;
  name: string;
  workflowStatus?: {
    name: string;
  };
}

// Generic record that can hold any fields from the API
export interface Record {
  id?: string;
  referenceNum?: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
  startDate?: string;
  dueDate?: string;
  position?: number;
  score?: number;
  progress?: number;
  progressSource?: string;
  description?: Description;
  workflowStatus?: WorkflowStatus;
  release?: Release;
  assignedToUser?: User;
  createdByUser?: User;
  team?: Team;
  project?: Project;
  initiative?: Initiative;
  epic?: Epic;
  feature?: {
    id: string;
    referenceNum: string;
    name: string;
    release?: Release;
  };
  tags?: Tag[];
  requirements?: RequirementSummary[];
  originalEstimate?: Estimate;
  remainingEstimate?: Estimate;
  workDone?: Estimate;
  customFieldValues?: CustomFieldValue[];
  [key: string]: any; // Allow additional fields
}

export interface FeatureResponse {
  feature: Record;
}

export interface RequirementResponse {
  requirement: Record;
}

export interface PageResponse {
  page: {
    id?: string;
    referenceNum?: string;
    name: string;
    createdAt?: string;
    updatedAt?: string;
    description?: Description;
    children?: Array<{
      id?: string;
      referenceNum?: string;
      name: string;
    }>;
    parent?: {
      id?: string;
      referenceNum?: string;
      name: string;
    };
  };
}

// Regular expressions for validating reference numbers
export const FEATURE_REF_REGEX = /^([A-Z][A-Z0-9]*)-(\d+)$/;
export const REQUIREMENT_REF_REGEX = /^([A-Z][A-Z0-9]*)-(\d+)-(\d+)$/;
export const NOTE_REF_REGEX = /^([A-Z][A-Z0-9]*)-N-(\d+)$/;

export interface SearchNode {
  name: string | null;
  url: string;
  searchableId: string;
  searchableType: string;
}

export interface SearchResponse {
  searchDocuments: {
    nodes: SearchNode[];
    currentPage: number;
    totalCount: number;
    totalPages: number;
    isLastPage: boolean;
  };
}
