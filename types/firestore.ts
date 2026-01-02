import { Scenario, TimelineState } from "@/app/types";

// Type for Firestore timestamps that can be various forms
type FirestoreTimestamp = { seconds: number; nanoseconds: number } | Date;

export interface FirestoreUser {
    email: string;
    displayName: string;
    createdAt: FirestoreTimestamp;
    photoURL: string;
}

export interface FirestoreScenario extends Scenario {
    id: string;
    userId: string;
    createdAt: FirestoreTimestamp;
    updatedAt: FirestoreTimestamp;
}

export interface FirestoreTimelineState extends TimelineState {
    userId: string;
    createdAt: FirestoreTimestamp;
    updatedAt: FirestoreTimestamp;
}
