import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { SceneCard } from "@/app/features/storyboard/components/scene-card";
import { Scenario } from "@/app/types";
import { vi, describe, it, expect } from "vitest";

vi.mock("@/auth", () => ({
    auth: vi.fn().mockResolvedValue({ user: { id: "test-user" } }),
}));

vi.mock("./edit-scene-modal", () => ({
    EditSceneModal: () => <div data-testid="edit-modal" />,
}));
vi.mock("./conversational-edit-modal", () => ({
    ConversationalEditModal: () => <div data-testid="magic-edit-modal" />,
}));
vi.mock("@/app/features/editor/components/video-player", () => ({
    VideoPlayer: () => <div data-testid="video-player" />,
}));
vi.mock("@/app/features/shared/components/ui/gcs-image", () => ({
    GcsImage: ({ alt }: { alt: string }) => (
        <div data-testid="gcs-image" aria-label={alt} />
    ),
}));

const mockScene = {
    imagePrompt: {
        Style: "Cinematic",
        Scene: "A beautiful sunset",
        Composition: {
            shot_type: "Wide Shot",
            lighting: "Golden Hour",
            overall_mood: "Peaceful",
        },
        Subject: [],
        Prop: [],
        Context: [],
    },
    videoPrompt: {
        Action: "Sunset",
        Camera_Motion: "Static",
        Ambiance_Audio: "Birds",
        Dialogue: [],
    },
    description: "Scene description",
    voiceover: "Voiceover text",
    charactersPresent: [],
};

const mockScenario = {
    name: "Test Scenario",
    aspectRatio: "16:9",
} as unknown as Scenario;

describe("SceneCard", () => {
    const defaultProps = {
        scene: mockScene,
        sceneNumber: 1,
        scenario: mockScenario,
        onUpdate: vi.fn(),
        onRegenerateImage: vi.fn(),
        onGenerateVideo: vi.fn(),
        onUploadImage: vi.fn(),
        onRemoveScene: vi.fn(),
        isGenerating: false,
        canDelete: true,
    };

    it("renders scene number and description", () => {
        render(<SceneCard {...defaultProps} />);
        expect(screen.getByText("Scene 1")).toBeDefined();
        expect(screen.getByText("Scene description")).toBeDefined();
    });

    it("renders GcsImage by default", () => {
        render(<SceneCard {...defaultProps} />);
        expect(screen.getByTestId("gcs-image")).toBeDefined();
    });

    it("renders VideoPlayer when displayMode is video and videoUri exists", () => {
        const sceneWithVideo = { ...mockScene, videoUri: "video.mp4" };
        render(
            <SceneCard
                {...defaultProps}
                scene={sceneWithVideo}
                displayMode="video"
            />,
        );
        expect(screen.getByTestId("video-player")).toBeDefined();
    });

    it("calls onRegenerateImage when regenerate button is clicked", () => {
        render(<SceneCard {...defaultProps} />);
        const regenerateBtn = screen.getByTitle("Regenerate Image");
        fireEvent.click(regenerateBtn);
        expect(defaultProps.onRegenerateImage).toHaveBeenCalled();
    });

    it("calls onGenerateVideo when generate video button is clicked", () => {
        render(<SceneCard {...defaultProps} />);
        const generateBtn = screen.getByTitle("Generate Video");
        fireEvent.click(generateBtn);
        expect(defaultProps.onGenerateVideo).toHaveBeenCalled();
    });

    it("calls onRemoveScene when delete button is clicked", () => {
        render(<SceneCard {...defaultProps} />);
        const deleteBtn = screen.getByTitle("Delete Scene");
        fireEvent.click(deleteBtn);
        expect(defaultProps.onRemoveScene).toHaveBeenCalled();
    });

    it("shows loader when isGenerating is true", () => {
        const { container } = render(
            <SceneCard {...defaultProps} isGenerating={true} />,
        );
        // Look for the spinner SVG
        const spinner = container.querySelector(".animate-spin");
        expect(spinner).toBeDefined();
    });
});
