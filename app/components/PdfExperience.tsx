"use client";

import {
  ArrowRight,
  CheckCircle,
  FileArrowUp,
  FilePdf,
  Fingerprint,
  LockKey,
  ShieldCheck,
  UserFocus,
  X,
} from "@phosphor-icons/react";
import { type ReactNode, useId, useRef, useState } from "react";
import {
  formatBytes,
  getStandardProfileCopy,
  getUiCopy,
  type Locale,
} from "@/lib/i18n";
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

export function PdfExperience({
  children,
  locale,
}: {
  children: ReactNode;
  locale: Locale;
}) {
  const copy = getUiCopy(locale);
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
      setError(copy.intake.errors.tooLarge);
      return;
    }
    if (profiles.length === 0) {
      setError(copy.intake.errors.noMapping);
      return;
    }

    abortRef.current?.abort();
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    const controller = new AbortController();
    abortRef.current = controller;
    setIsAnalyzing(true);
    setError(null);
    setProgress({ completedPages: 0, totalPages: 0, message: copy.intake.opening });

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
      setError(localizeAnalysisError(caught, locale, copy.intake.errors.analyzeFailed));
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
      if (!response.ok) throw new Error(copy.intake.errors.unavailable);
      const sample = new File([await response.arrayBuffer()], name, {
        type: "application/pdf",
      });
      selectFile(sample);
      await runAnalysis(sample);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : copy.intake.errors.unavailable,
      );
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
            <span aria-hidden="true" /> {copy.hero.eyebrow}
          </p>
          <h1 id="hero-title">{copy.hero.title}</h1>
          <p className="hero-lead">{copy.hero.lead}</p>
          <div className="hero-actions">
            <a className="hero-primary-action" href="#analyzer">
              {copy.hero.primaryAction} <ArrowRight aria-hidden="true" />
            </a>
            <a className="hero-secondary-action" href="#workflow">
              {copy.hero.secondaryAction} <ArrowRight aria-hidden="true" />
            </a>
          </div>
          <ul className="hero-points" aria-label={copy.hero.boundariesAria}>
            {copy.hero.boundaries.map((boundary) => (
              <li key={boundary}>
                <CheckCircle weight="fill" aria-hidden="true" /> {boundary}
              </li>
            ))}
          </ul>
          <p className="boundary-note">
            <ShieldCheck weight="duotone" aria-hidden="true" />{
              " "
            }{copy.hero.boundaryNote}
          </p>
        </div>

        <aside className="hero-preview" aria-label={copy.hero.preview.aria}>
          <div className="preview-topline">
            <span>{copy.hero.preview.label}</span>
            <span>{copy.hero.preview.pageCount}</span>
          </div>
          <div className="preview-document">
            <FilePdf weight="duotone" aria-hidden="true" />
            <strong>{copy.hero.preview.fileName}</strong>
          </div>
          <div className="preview-body">
            <div className="preview-queue" aria-label={copy.hero.preview.aria}>
              {copy.hero.preview.rows.map((row, index) => (
                <div className={index === 0 ? "is-selected" : undefined} key={row.label}>
                  {index === 0 ? (
                    <CheckCircle weight="fill" aria-hidden="true" />
                  ) : (
                    <UserFocus weight="duotone" aria-hidden="true" />
                  )}
                  <span>
                    <strong>{row.label}</strong>
                    <small>{row.status}</small>
                  </span>
                </div>
              ))}
            </div>
            <div className="preview-detail">
              <span>{copy.hero.preview.selectedFinding}</span>
              <h2>{copy.hero.preview.title}</h2>
              <p>{copy.hero.preview.copy}</p>
              <strong>
                <CheckCircle weight="fill" aria-hidden="true" />
                {copy.hero.preview.reviewer}
              </strong>
            </div>
          </div>
          <div className="preview-footer">
            <Fingerprint aria-hidden="true" />
            <span>{copy.hero.preview.fingerprint}</span>
          </div>
        </aside>
      </section>

      {children}

      <section id="analyzer" className="analyzer-section" aria-labelledby="analyzer-title">
        <div className="analyzer-intro">
          <p className="section-label">{copy.intake.sectionLabel}</p>
          <h2 id="analyzer-title">{copy.intake.sectionTitle}</h2>
          <p>{copy.intake.sectionIntro}</p>
          <p className="analyzer-boundary">
            <ShieldCheck weight="duotone" aria-hidden="true" />
            {copy.hero.boundaryNote}
          </p>
        </div>
        <div className="hero-analyzer">
          <section className="intake-card" aria-labelledby="intake-title">
            <div className="intake-heading">
              <div>
                <p className="card-kicker">{copy.intake.kicker}</p>
                <h3 id="intake-title">{copy.intake.title}</h3>
              </div>
              <span className="privacy-chip">
                <LockKey weight="bold" aria-hidden="true" /> {copy.intake.privacyChip}
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
              <strong>{file ? file.name : copy.intake.chooseOrDrop}</strong>
              <span>
                {file
                  ? `${formatBytes(file.size, locale)} ${copy.intake.selected}`
                  : copy.intake.fileRequirements}
              </span>
              <span className="file-button">{copy.intake.browse}</span>
            </label>
            <input
              ref={inputRef}
              id={inputId}
              className="visually-hidden"
              data-testid="pdf-file-input"
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
                <X aria-hidden="true" /> {copy.intake.remove}
              </button>
            ) : null}

            <fieldset className="profile-fieldset">
              <legend>{copy.intake.mappingLegend}</legend>
              <div className="profile-options">
                {STANDARD_PROFILES.map((profile) => {
                  const profileCopy = getStandardProfileCopy(profile.id, locale);
                  return (
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
                        <strong>{profileCopy.shortName}</strong>
                        <small>{profileCopy.scopeNote}</small>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {isAnalyzing && progress ? (
              <div className="analysis-progress" aria-live="polite">
                <div>
                  <span>{localizeProgress(progress, locale, copy.intake.opening)}</span>
                  <span>
                    {progress.totalPages
                      ? `${progress.completedPages}/${progress.totalPages}`
                      : copy.intake.starting}
                  </span>
                </div>
                <progress
                  aria-label={copy.intake.progressAria}
                  max={progress.totalPages || 1}
                  value={progress.completedPages}
                />
                <button type="button" onClick={() => abortRef.current?.abort()}>
                  {copy.intake.cancel}
                </button>
              </div>
            ) : (
              <button
                className="analyze-button"
                type="button"
                disabled={!file}
                onClick={() => void runAnalysis()}
              >
                {copy.intake.analyze}
              </button>
            )}

            {error ? (
              <p className="form-error" role="alert">
                {error}
              </p>
            ) : null}
            <p className="intake-disclaimer">{copy.intake.privacy}</p>
            <div className="sample-actions" aria-label={copy.intake.samplesAria}>
              <span>{copy.intake.samplesLead}</span>
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
                {copy.intake.taggedSample}
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
                {copy.intake.issuesSample}
              </button>
            </div>
          </section>
        </div>
      </section>

      {analysis && sourceBytes ? (
        <AnalysisWorkspace
          key={analysis.fingerprint}
          locale={locale}
          initialAnalysis={analysis}
          initialBytes={sourceBytes}
          onReset={reset}
        />
      ) : null}
    </>
  );
}

function localizeProgress(
  progress: AnalysisProgress,
  locale: Locale,
  opening: string,
): string {
  if (locale === "en") return progress.message;
  if (progress.message === "Opening PDF") return opening;
  if (progress.message === "Reading document metadata") return "正在读取文档元数据";
  const pageProgress = /^Analyzed page (\d+) of (\d+)$/.exec(progress.message);
  return pageProgress
    ? `已分析第 ${pageProgress[1]} 页，共 ${pageProgress[2]} 页`
    : progress.message;
}

function localizeAnalysisError(
  caught: unknown,
  locale: Locale,
  fallback: string,
): string {
  if (!(caught instanceof PdfAnalysisError)) {
    return caught instanceof Error ? caught.message : fallback;
  }
  if (locale === "en") return caught.message;
  const messages: Record<PdfAnalysisError["code"], string> = {
    "file-too-large": "请选择不超过 50 MB 的 PDF。",
    "not-pdf": "所选文件不包含有效的 PDF 文件头。",
    "page-limit": "此 MVP 仅支持 1–100 页的 PDF。",
    password: "此 PDF 受密码保护。请先在获批流程中移除密码，再进行分析。",
    cancelled: "分析已取消，未保留文件数据。",
    "analysis-budget": "此 PDF 超出 MVP 的分析安全预算，请升级到受控桌面流程处理。",
    "parse-error": "无法将此文件解析为受支持的 PDF。",
  };
  return messages[caught.code];
}
