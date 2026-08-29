"use client";

import {
  CheckCircle,
  FileArrowUp,
  FilePdf,
  LockKey,
  ShieldCheck,
  X,
} from "@phosphor-icons/react";
import { useId, useRef, useState } from "react";
import {
  analyzePdf,
  MAX_FILE_BYTES,
  PdfAnalysisError,
} from "@/lib/pdf/analyze";
import { STANDARD_PROFILES } from "@/lib/pdf/standards";
import type {
  AnalysisProgress,
  PdfAnalysis,
  StandardProfileId,
} from "@/lib/pdf/types";
import { AnalysisWorkspace } from "./Workspace";

const DEFAULT_PROFILES: StandardProfileId[] = ["wcag21", "section508"];

export function PdfExperience() {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestRef = useRef(0);
  const [file, setFile] = useState<File | null>(null);
  const [profiles, setProfiles] =
    useState<StandardProfileId[]>(DEFAULT_PROFILES);
  const [analysis, setAnalysis] = useState<PdfAnalysis | null>(null);
  const [sourceBytes, setSourceBytes] = useState<Uint8Array | null>(null);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const selectFile = (nextFile: File | null) => {
    requestRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    setError(null);
    setFile(nextFile);
    setAnalysis(null);
    setSourceBytes(null);
    setProgress(null);
    setIsAnalyzing(false);
  };

  const runAnalysis = async (selectedFile = file) => {
    if (!selectedFile) return;
    if (selectedFile.size > MAX_FILE_BYTES) {
      setError("Choose a PDF no larger than 50 MB.");
      return;
    }
    if (profiles.length === 0) {
      setError("Choose at least one evidence mapping.");
      return;
    }

    abortRef.current?.abort();
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    const controller = new AbortController();
    abortRef.current = controller;
    setIsAnalyzing(true);
    setError(null);
    setProgress({ completedPages: 0, totalPages: 0, message: "Opening PDF" });

    try {
      const bytes = new Uint8Array(await selectedFile.arrayBuffer());
      const result = await analyzePdf(bytes, {
        fileName: selectedFile.name,
        profileIds: profiles,
        signal: controller.signal,
        onProgress: (nextProgress) => {
          if (requestRef.current === requestId) setProgress(nextProgress);
        },
      });
      if (requestRef.current !== requestId) return;
      setSourceBytes(bytes);
      setAnalysis(result);
      window.setTimeout(() => {
        document.getElementById("analysis-workspace-title")?.focus();
      }, 0);
    } catch (caught) {
      if (requestRef.current !== requestId) return;
      const message =
        caught instanceof PdfAnalysisError || caught instanceof Error
          ? caught.message
          : "The PDF could not be analyzed.";
      setError(message);
    } finally {
      if (requestRef.current === requestId) {
        abortRef.current = null;
        setIsAnalyzing(false);
      }
    }
  };

  const loadSample = async (path: string, name: string) => {
    setError(null);
    try {
      const response = await fetch(path);
      if (!response.ok) throw new Error("Sample file is unavailable.");
      const sample = new File([await response.arrayBuffer()], name, {
        type: "application/pdf",
      });
      selectFile(sample);
      await runAnalysis(sample);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sample file is unavailable.");
    }
  };

  const reset = () => {
    abortRef.current?.abort();
    setFile(null);
    setAnalysis(null);
    setSourceBytes(null);
    setError(null);
    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <>
      <section className="hero" id="top" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">
            <span aria-hidden="true" /> Guided PDF remediation
          </p>
          <h1 id="hero-title">
            Turn accessibility findings into reviewable fixes and defensible
            evidence.
          </h1>
          <p className="hero-lead">
            Analyze text-based PDFs in your browser, locate structural risks by
            page, guide human review, and export a versioned remediation evidence
            pack.
          </p>
          <ul className="hero-points" aria-label="Product boundaries">
            <li>
              <CheckCircle weight="fill" aria-hidden="true" /> Machine-detected
              failures stay separate from human verification.
            </li>
            <li>
              <CheckCircle weight="fill" aria-hidden="true" /> Every finding keeps
              its page, evidence, method, mapping, and status.
            </li>
            <li>
              <CheckCircle weight="fill" aria-hidden="true" /> Complex tags,
              tables, formulas, and forms escalate to specialists.
            </li>
          </ul>
          <p className="boundary-note">
            <ShieldCheck weight="duotone" aria-hidden="true" /> Guided
            remediation—not one-click compliance.
          </p>
        </div>

        <div id="analyzer" className="hero-analyzer">
          <section className="intake-card" aria-labelledby="intake-title">
            <div className="intake-heading">
              <div>
                <p className="card-kicker">Local analyzer</p>
                <h2 id="intake-title">Review a PDF</h2>
              </div>
              <span className="privacy-chip">
                <LockKey weight="bold" aria-hidden="true" /> In-browser
              </span>
            </div>

            <label
              className={`drop-zone${isDragging ? " is-dragging" : ""}`}
              htmlFor={inputId}
              aria-disabled={isAnalyzing}
              onDragEnter={(event) => {
                event.preventDefault();
                if (isAnalyzing) return;
                setIsDragging(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                if (isAnalyzing) return;
                selectFile(event.dataTransfer.files?.[0] ?? null);
              }}
            >
              {file ? (
                <FilePdf weight="duotone" aria-hidden="true" />
              ) : (
                <FileArrowUp weight="duotone" aria-hidden="true" />
              )}
              <strong>{file ? file.name : "Choose or drop a PDF"}</strong>
              <span>
                {file
                  ? `${formatBytes(file.size)} selected`
                  : "Text-based PDF · 1–100 pages · up to 50 MB"}
              </span>
              <span className="file-button">Browse files</span>
            </label>
            <input
              ref={inputRef}
              id={inputId}
              className="visually-hidden"
              type="file"
              accept="application/pdf,.pdf"
              disabled={isAnalyzing}
              onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
            />

            {file ? (
              <button
                className="clear-file"
                type="button"
                disabled={isAnalyzing}
                onClick={() => {
                  selectFile(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
              >
                <X aria-hidden="true" /> Remove selected file
              </button>
            ) : null}

            <fieldset className="profile-fieldset">
              <legend>Evidence mapping</legend>
              <div className="profile-options">
                {STANDARD_PROFILES.map((profile) => (
                  <label key={profile.id}>
                    <input
                      type="checkbox"
                      checked={profiles.includes(profile.id)}
                      disabled={isAnalyzing}
                      onChange={() =>
                        setProfiles((current) =>
                          current.includes(profile.id)
                            ? current.filter((id) => id !== profile.id)
                            : [...current, profile.id],
                        )
                      }
                    />
                    <span>
                      <strong>{profile.shortName}</strong>
                      <small>{profile.scopeNote}</small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {isAnalyzing && progress ? (
              <div className="analysis-progress" aria-live="polite">
                <div>
                  <span>{progress.message}</span>
                  <span>
                    {progress.totalPages
                      ? `${progress.completedPages}/${progress.totalPages}`
                      : "Starting"}
                  </span>
                </div>
                <progress
                  aria-label="PDF analysis progress"
                  max={progress.totalPages || 1}
                  value={progress.completedPages}
                />
                <button type="button" onClick={() => abortRef.current?.abort()}>
                  Cancel analysis
                </button>
              </div>
            ) : (
              <button
                className="analyze-button"
                type="button"
                disabled={!file}
                onClick={() => void runAnalysis()}
              >
                Analyze locally
              </button>
            )}

            {error ? (
              <p className="form-error" role="alert">
                {error}
              </p>
            ) : null}
            <p className="intake-disclaimer">
              Files and extracted content stay in this tab. No PDF text, field
              values, or link targets are logged or uploaded.
            </p>
            <div className="sample-actions" aria-label="Test with sample PDFs">
              <span>Try a real fixture:</span>
              <button
                type="button"
                disabled={isAnalyzing}
                onClick={() =>
                  void loadSample(
                    "/fixtures/well-tagged-basic.pdf",
                    "well-tagged-basic.pdf",
                  )
                }
              >
                Well-tagged sample
              </button>
              <button
                type="button"
                disabled={isAnalyzing}
                onClick={() =>
                  void loadSample(
                    "/fixtures/known-accessibility-issues.pdf",
                    "known-accessibility-issues.pdf",
                  )
                }
              >
                Known-issues sample
              </button>
            </div>
          </section>
        </div>
      </section>

      {analysis && sourceBytes ? (
        <AnalysisWorkspace
          key={analysis.fingerprint}
          initialAnalysis={analysis}
          initialBytes={sourceBytes}
          onReset={reset}
        />
      ) : null}
    </>
  );
}

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
