// @vitest-environment jsdom

import CaseStudyForm from "@/components/admin/case-study-form";
import VideoForm from "@/components/admin/video-form";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const categories = vi.hoisted(() => ({
  video: [{ _id: "507f1f77bcf86cd799439011", name: "Walkthroughs", slug: "walkthroughs", sequence: 1, tags: [] }],
}));

vi.mock("@/services/category.service", () => ({
  getVideoCategories: vi.fn(async () => ({ success: true, data: categories.video })),
  getCaseStudyCategories: vi.fn(async () => ({
    success: true,
    data: [{ _id: "507f1f77bcf86cd799439022", name: "Platform builds", slug: "platform-builds", sequence: 1, tags: [] }],
  })),
}));
vi.mock("next/image", () => ({
  default: ({ alt }: { alt?: string }) => <img alt={alt || ""} />,
}));
vi.mock("@/components/ui/file-uploader", () => ({
  FileUploader: ({
    purpose,
    onChange,
    value,
  }: {
    purpose: string;
    onChange: (file: unknown) => void;
    value?: { filename?: string } | null;
  }) => (
    <button
      type="button"
      data-purpose={purpose}
      onClick={() =>
        onChange({
          _id: `file-${purpose}`,
          url: "https://res.cloudinary.com/x/video/upload/a.mp4",
          filename: "a.mp4",
          mimetype: "video/mp4",
          size: 1,
          provider: "cloudinary",
          metadata: purpose === "video_file" ? { width: 360, height: 640, duration: 12.4 } : {},
        })
      }
    >
      {value?.filename ? `Replace ${purpose}` : `Pick ${purpose}`}
    </button>
  ),
}));
vi.mock("@/components/ui/file-gallery-uploader", () => ({
  FileGalleryUploader: () => <div />,
}));

const ID = "dQw4w9WgXcQ";

describe("VideoForm", () => {
  afterEach(cleanup);

  const setup = () => {
    const onSubmit = vi.fn();
    render(<VideoForm onSubmit={onSubmit} onCancel={vi.fn()} />);
    return onSubmit;
  };

  const fillBasics = async () => {
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Title"), "A video");
    await waitFor(() => expect(screen.getByRole("option", { name: "Walkthroughs" })).toBeInTheDocument());
    await user.selectOptions(screen.getByLabelText("Category"), "507f1f77bcf86cd799439011");
    return user;
  };

  it("submits a YouTube reel with the canonical fields and no file", async () => {
    const onSubmit = setup();
    const user = await fillBasics();
    await user.click(screen.getByLabelText(/Reel/));
    await user.type(screen.getByLabelText("YouTube link"), `https://youtu.be/${ID}`);
    expect(screen.getByText(`Detected YouTube video ${ID}`)).toBeInTheDocument();
    await user.type(screen.getByLabelText("Keywords (optional)"), "a, b ,, a");
    await user.click(screen.getByRole("button", { name: "Create Video" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({
      name: "A video",
      category: "507f1f77bcf86cd799439011",
      aspect_ratio: "reel",
      source_type: "youtube",
      youtube_url: `https://youtu.be/${ID}`,
      video_file: null,
      keywords: ["a", "b", "a"],
      status: "draft",
      thumbnail: null,
    });
  });

  it("blocks an invalid link and a missing title or category with clear messages", async () => {
    const onSubmit = setup();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("YouTube link"), "https://vimeo.com/123");
    expect(screen.getByText("This is not a valid YouTube video link.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Create Video" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Enter a title.")).toBeInTheDocument();
    expect(screen.getByText("Select an active video category.")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid YouTube video link.")).toBeInTheDocument();
  });

  it("uploads a file, adopts its shape and length, and clears the YouTube fields", async () => {
    const onSubmit = setup();
    const user = await fillBasics();
    await user.click(screen.getByLabelText("Uploaded file"));
    await user.click(screen.getByRole("button", { name: "Create Video" }));
    expect(screen.getByText("Upload a video file.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Pick video_file" }));
    // The portrait file switches the shape to a reel and fills the duration.
    expect(screen.getByLabelText(/Reel/)).toBeChecked();
    expect(screen.getByLabelText(/Duration in seconds/)).toHaveValue(12);
    await user.click(screen.getByRole("button", { name: "Create Video" }));
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({
      source_type: "upload",
      video_file: "file-video_file",
      youtube_url: null,
      aspect_ratio: "reel",
      duration_seconds: 12,
    });
  });
});

describe("CaseStudyForm", () => {
  afterEach(cleanup);

  it("maps the story, results and links to the API payload", async () => {
    const onSubmit = vi.fn();
    render(<CaseStudyForm onSubmit={onSubmit} onCancel={vi.fn()} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Title"), "A story");
    await waitFor(() => expect(screen.getByRole("option", { name: "Platform builds" })).toBeInTheDocument());
    await user.selectOptions(screen.getByLabelText("Category"), "507f1f77bcf86cd799439022");
    await user.type(screen.getByLabelText("The challenge"), "Hard problem");
    await user.type(screen.getByLabelText("Key decisions"), "First{enter}Second");
    await user.type(screen.getByLabelText("Tools used"), "Next.js, MongoDB");
    await user.click(screen.getByRole("button", { name: "Add result" }));
    await user.type(screen.getByLabelText("Result 1 value"), "None");
    await user.type(screen.getByLabelText("Result 1 label"), "redeploys needed");
    await user.type(screen.getByLabelText("Live product URL"), "https://example.com");
    await user.click(screen.getByLabelText("Show the live link publicly"));
    await user.click(screen.getByRole("button", { name: "Create Case Study" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({
      name: "A story",
      category: "507f1f77bcf86cd799439022",
      challenge: "Hard problem",
      key_decisions: ["First", "Second"],
      tech_stack: ["Next.js", "MongoDB"],
      outcomes: [{ label: "redeploys needed", value: "None", verification_state: "derived" }],
      live_url: "https://example.com",
      live_url_visibility: "public",
      source_url: null,
      source_url_visibility: "hidden",
      show_client_name: false,
    });
  });

  it("refuses a verified result without private evidence", async () => {
    const onSubmit = vi.fn();
    render(<CaseStudyForm onSubmit={onSubmit} onCancel={vi.fn()} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Title"), "A story");
    await waitFor(() => expect(screen.getByRole("option", { name: "Platform builds" })).toBeInTheDocument());
    await user.selectOptions(screen.getByLabelText("Category"), "507f1f77bcf86cd799439022");
    await user.click(screen.getByRole("button", { name: "Add result" }));
    await user.type(screen.getByLabelText("Result 1 value"), "3");
    await user.type(screen.getByLabelText("Result 1 label"), "things");
    fireEvent.change(screen.getByLabelText("Result 1 verification"), { target: { value: "verified" } });
    await user.click(screen.getByRole("button", { name: "Create Case Study" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/verified but has no evidence/);
    await user.type(screen.getByLabelText("Result 1 evidence reference"), "ticket-42");
    await user.click(screen.getByRole("button", { name: "Create Case Study" }));
    expect(onSubmit.mock.calls[0]![0].outcomes[0]).toMatchObject({
      verification_state: "verified",
      evidence_reference: "ticket-42",
    });
  });
});
