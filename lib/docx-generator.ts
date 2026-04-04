import { Packer } from "docx";
import type { DocumentContent } from "./types";
import { buildDocumentA } from "./document-templates/template-a";
import { buildDocumentB } from "./document-templates/template-b";
import { buildDocumentC } from "./document-templates/template-c";
import { buildDocumentD } from "./document-templates/template-d";
import { buildDocumentE } from "./document-templates/template-e";
import { buildDocumentF } from "./document-templates/template-f";
import { buildDocumentSeizure } from "./document-templates/template-seizure";

/**
 * DocumentContent를 .docx Buffer로 변환한다.
 * 서류 코드에 따라 적절한 템플릿을 선택한다.
 */
export async function generateDocx(content: DocumentContent): Promise<Buffer> {
  const builders = {
    A: buildDocumentA,
    B: buildDocumentB,
    C: buildDocumentC,
    D: buildDocumentD,
    E: buildDocumentE,
    F: buildDocumentF,
    seizure: buildDocumentSeizure,
  } as const;

  const builder = builders[content.type] ?? buildDocumentA;
  const doc = builder(content);
  return await Packer.toBuffer(doc) as Buffer;
}
