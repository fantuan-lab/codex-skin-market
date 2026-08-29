import { createWriteStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";
import { PNG } from "pngjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(root, "public", "fixtures");
const fixedDate = new Date("2026-08-29T12:00:00.000Z");

await mkdir(outputDirectory, { recursive: true });
await createWellTaggedFixture(path.join(outputDirectory, "well-tagged-basic.pdf"));
await createKnownIssuesFixture(
  path.join(outputDirectory, "known-accessibility-issues.pdf"),
);
await createImageOnlyFixture(path.join(outputDirectory, "image-only-scan.pdf"));

await writeFile(
  path.join(outputDirectory, "manifest.json"),
  `${JSON.stringify(
    {
      generatedAt: fixedDate.toISOString(),
      generator: "PDFKit 0.20.1 + PNGJS 7",
      fixtures: [
        {
          file: "well-tagged-basic.pdf",
          intent:
            "Positive machine-verifiable signals: Title, DisplayDocTitle, Lang, tagged H1/P/list/Figure-alt/table and a link annotation. Not represented as a conformance certificate.",
        },
        {
          file: "known-accessibility-issues.pdf",
          intent:
            "Text PDF with deliberately missing Title, Lang, and tagged structure plus visual list/table patterns and an AcroForm widget without a TU tooltip.",
        },
        {
          file: "image-only-scan.pdf",
          intent:
            "One-page raster-only PDF with no text objects, used to verify the OCR-risk signal comes from PDF content.",
        },
      ],
    },
    null,
    2,
  )}\n`,
  "utf8",
);

async function createWellTaggedFixture(outputPath) {
  const doc = new PDFDocument({
    size: "LETTER",
    margins: { top: 54, right: 58, bottom: 54, left: 58 },
    tagged: true,
    lang: "en-US",
    displayTitle: true,
    subset: "PDF/UA-1",
    compress: false,
    info: {
      Title: "Student Services Orientation Guide",
      Author: "ClearTag Fixture Lab",
      Subject: "A deliberately small, well-tagged analyzer fixture",
      Creator: "ClearTag fixture generator",
      Producer: "PDFKit 0.20.1",
      CreationDate: fixedDate,
      ModDate: fixedDate,
    },
  });
  const done = pipeDocument(doc, outputPath);
  const rootStructure = doc.struct("Document", { lang: "en-US" });
  doc.addStructure(rootStructure);

  rootStructure.add(
    doc.struct("H1", () => {
      doc.fillColor("#123f39").font("Helvetica-Bold").fontSize(25)
        .text("Student Services Orientation Guide", { paragraphGap: 9 });
    }),
  );
  rootStructure.add(
    doc.struct("P", () => {
      doc.fillColor("#263b38").font("Helvetica").fontSize(11)
        .text(
          "This two-page fixture provides machine-verifiable metadata and structure signals for integration tests. A human reviewer must still judge meaning and usability.",
          { lineGap: 3, paragraphGap: 13 },
        );
    }),
  );
  rootStructure.add(
    doc.struct("H2", () => {
      doc.fillColor("#123f39").font("Helvetica-Bold").fontSize(17)
        .text("Before orientation", { paragraphGap: 6 });
    }),
  );

  const list = doc.struct("L");
  rootStructure.add(list);
  for (const item of [
    "Bring your student identification card.",
    "Review the campus accessibility services page.",
    "Ask staff for an alternate format when needed.",
  ]) {
    const listItem = doc.struct("LI");
    list.add(listItem);
    listItem.add(
      doc.struct("Lbl", () => {
        doc.fillColor("#123f39").font("Helvetica-Bold").fontSize(11)
          .text("•", 66, doc.y, { width: 12, continued: false });
      }),
    );
    const bodyY = doc.y - 13;
    listItem.add(
      doc.struct("LBody", () => {
        doc.fillColor("#263b38").font("Helvetica").fontSize(11)
          .text(item, 82, bodyY, { width: 440, lineGap: 2 });
      }),
    );
    doc.y = Math.max(doc.y, bodyY + 25);
    listItem.end();
  }
  list.end();

  rootStructure.add(
    doc.struct(
      "Figure",
      { alt: "Three connected circles labelled Plan, Review, and Deliver." },
      () => {
        const y = doc.y + 12;
        const colors = ["#dcebe7", "#b6d7ce", "#7fac9f"];
        ["Plan", "Review", "Deliver"].forEach((label, index) => {
          const x = 94 + index * 145;
          doc.fillColor(colors[index]).circle(x, y + 28, 25).fill();
          if (index < 2) {
            doc.strokeColor("#66817a").lineWidth(2).moveTo(x + 27, y + 28)
              .lineTo(x + 118, y + 28).stroke();
          }
          doc.fillColor("#173d37").font("Helvetica-Bold").fontSize(7)
            .text(label, x - 20, y + 25, { width: 40, align: "center" });
        });
        doc.x = doc.page.margins.left;
        doc.y = y + 72;
      },
    ),
  );

  rootStructure.add(
    doc.struct("H2", () => {
      doc.fillColor("#123f39").font("Helvetica-Bold").fontSize(17)
        .text("Service desk schedule", { paragraphGap: 7 });
    }),
  );
  const table = doc.struct("Table");
  rootStructure.add(table);
  const rows = [
    ["Day", "Hours", "Location"],
    ["Monday", "9:00–16:00", "North Hall"],
    ["Wednesday", "10:00–18:00", "Library"],
  ];
  const columnX = [60, 220, 350];
  rows.forEach((row, rowIndex) => {
    const tableRow = doc.struct("TR");
    table.add(tableRow);
    const y = doc.y;
    row.forEach((cell, columnIndex) => {
      const role = rowIndex === 0 ? "TH" : "TD";
      const cellOptions = rowIndex === 0 ? { scope: "Column" } : {};
      tableRow.add(
        doc.struct(role, cellOptions, () => {
          doc.rect(columnX[columnIndex], y, columnIndex === 0 ? 160 : 130, 25)
            .fillAndStroke(rowIndex === 0 ? "#dcebe7" : "#ffffff", "#83958f");
          doc.fillColor("#213934").font(rowIndex === 0 ? "Helvetica-Bold" : "Helvetica")
            .fontSize(9).text(cell, columnX[columnIndex] + 6, y + 8, { width: 115 });
        }),
      );
    });
    doc.y = y + 25;
    tableRow.end();
  });
  table.end();

  doc.addPage();
  rootStructure.add(
    doc.struct("H2", () => {
      doc.fillColor("#123f39").font("Helvetica-Bold").fontSize(18)
        .text("Request an alternate format", { paragraphGap: 10 });
    }),
  );
  rootStructure.add(
    doc.struct("P", () => {
      doc.fillColor("#263b38").font("Helvetica").fontSize(11)
        .text(
          "Contact Accessibility Services before your appointment when you need a tagged PDF, large print, or another supported format.",
          { lineGap: 3, paragraphGap: 12 },
        );
    }),
  );
  rootStructure.add(
    doc.struct("Link", () => {
      doc.fillColor("#075f99").font("Helvetica-Bold").fontSize(11)
        .text("Visit the Accessibility Services information page", {
          link: "https://example.edu/accessibility-services",
          underline: true,
        });
    }),
  );
  rootStructure.end();
  doc.end();
  await done;
}

async function createKnownIssuesFixture(outputPath) {
  const doc = new PDFDocument({
    size: "LETTER",
    margins: { top: 52, right: 56, bottom: 52, left: 56 },
    compress: false,
    info: {
      Creator: "ClearTag fixture generator",
      Producer: "PDFKit 0.20.1",
      CreationDate: fixedDate,
      ModDate: fixedDate,
    },
  });
  const done = pipeDocument(doc, outputPath);
  doc.fillColor("#17211f").font("Helvetica-Bold").fontSize(24)
    .text("Community Grant Application", { paragraphGap: 11 });
  doc.font("Helvetica").fontSize(11).fillColor("#273c38")
    .text(
      "This fixture intentionally uses visible formatting without a tagged structure tree, document title, or document language.",
      { lineGap: 3, paragraphGap: 15 },
    );
  doc.font("Helvetica-Bold").fontSize(16).text("Required materials", { paragraphGap: 6 });
  doc.font("Helvetica").fontSize(11);
  [
    "• Signed application cover sheet",
    "• Program budget and schedule",
    "• Contact information for the project lead",
  ].forEach((item) => doc.text(item, { indent: 10, paragraphGap: 3 }));

  doc.moveDown(1.2).font("Helvetica-Bold").fontSize(16).text("Funding limits", { paragraphGap: 7 });
  const rows = [
    ["Program", "Maximum", "Match"],
    ["Arts", "$8,000", "10%"],
    ["Housing", "$15,000", "20%"],
    ["Training", "$5,000", "None"],
  ];
  rows.forEach((row, index) => {
    const y = doc.y;
    row.forEach((cell, column) => {
      const x = [60, 245, 380][column];
      doc.rect(x, y, [185, 135, 130][column], 25)
        .fillAndStroke(index === 0 ? "#e7e8e5" : "#ffffff", "#8f9996");
      doc.fillColor("#17211f").font(index === 0 ? "Helvetica-Bold" : "Helvetica")
        .fontSize(9).text(cell, x + 6, y + 8, { width: 115 });
    });
    doc.y = y + 25;
  });

  const linkY = 390;
  doc.fillColor("#075f99").font("Helvetica-Bold").fontSize(11)
    .text("Download the full application instructions", 60, linkY, {
      width: 360,
      link: "https://example.gov/grants/application-guide",
      underline: true,
    });
  const formHeadingY = 452;
  doc.fillColor("#17211f").font("Helvetica-Bold").fontSize(16)
    .text("Applicant contact", 60, formHeadingY, { width: 360 });
  const fieldY = formHeadingY + 36;
  doc.font("Helvetica").fontSize(10).text("Internal field code", 60, fieldY + 6, { width: 110 });
  doc.rect(180, fieldY, 230, 24).fillAndStroke("#ffffff", "#6f7a77");
  doc.font("Helvetica").initForm();
  doc.formText("field_17", 180, fieldY, 230, 24, {
    borderColor: "#6f7a77",
    backgroundColor: "#ffffff",
    fontSize: 10,
  });
  doc.end();
  await done;
}

async function createImageOnlyFixture(outputPath) {
  const png = new PNG({ width: 1200, height: 1600, colorType: 6 });
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const index = (png.width * y + x) << 2;
      const paperNoise = (x * 17 + y * 31) % 9;
      const shade = 244 - paperNoise;
      png.data[index] = shade;
      png.data[index + 1] = shade;
      png.data[index + 2] = shade - 2;
      png.data[index + 3] = 255;
    }
  }
  const bars = [
    [110, 130, 760, 42],
    [110, 235, 970, 17],
    [110, 282, 920, 17],
    [110, 329, 995, 17],
    [110, 435, 520, 31],
    [110, 520, 980, 17],
    [110, 568, 890, 17],
    [110, 616, 945, 17],
    [110, 722, 470, 31],
    [110, 810, 970, 17],
    [110, 858, 930, 17],
    [110, 906, 985, 17],
    [110, 1012, 830, 31],
    [110, 1100, 970, 17],
    [110, 1148, 790, 17],
    [110, 1196, 880, 17],
  ];
  for (const [left, top, width, height] of bars) {
    for (let y = top; y < top + height; y += 1) {
      for (let x = left; x < left + width; x += 1) {
        const index = (png.width * y + x) << 2;
        const ink = height > 20 ? 55 : 98;
        png.data[index] = ink;
        png.data[index + 1] = ink;
        png.data[index + 2] = ink;
        png.data[index + 3] = 255;
      }
    }
  }
  const imageBuffer = PNG.sync.write(png);
  const doc = new PDFDocument({
    size: "LETTER",
    margin: 0,
    compress: false,
    info: {
      Creator: "ClearTag fixture generator",
      Producer: "PDFKit 0.20.1",
      CreationDate: fixedDate,
      ModDate: fixedDate,
    },
  });
  const done = pipeDocument(doc, outputPath);
  doc.image(imageBuffer, 0, 0, { width: 612, height: 792 });
  doc.end();
  await done;
}

function pipeDocument(doc, outputPath) {
  const stream = createWriteStream(outputPath);
  doc.pipe(stream);
  return new Promise((resolve, reject) => {
    stream.once("finish", resolve);
    stream.once("error", reject);
  });
}
