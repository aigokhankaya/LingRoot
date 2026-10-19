import type { ProductionFormat, TopicBrief, VisualScenes } from "../core/types.js";

export interface PlanVisualScenesInput {
  topicId: string;
  topic: string;
  sceneCount: number;
  visualOutline?: TopicBrief["visualOutline"];
  visualStyle?: string;
  productionFormat?: ProductionFormat;
}

export function planVisualScenes(input: PlanVisualScenesInput): VisualScenes {
  const { topicId, topic, sceneCount } = input;
  const outline = input.visualOutline;
  if (outline && outline.length !== sceneCount) {
    throw new Error("Visual outline count must match sceneCount.");
  }
  if (outline && outline.some((scene, index) => scene.order !== index)) {
    throw new Error("Visual outline must use contiguous zero-based order.");
  }
  const scenes = Array.from({ length: sceneCount }, (_, index) => {
    const sceneNumber = index + 1;
    const brief = outline?.[index];
    return {
      sceneId: brief?.sceneId ?? `scene-${sceneNumber}`,
      order: index,
      imagePrompt: [
        `Create scene ${sceneNumber} of ${sceneCount} for a ${input.productionFormat === "long" ? "long-form" : "short"} educational listening video about: ${topic}.`,
        brief ? `Narrative beat: ${brief.narrativeBeat}` : "",
        `Visual style: ${input.visualStyle?.trim() || "warm, modern, realistic editorial photography"}; adult-friendly and visually clear.`,
        input.productionFormat === "long"
          ? "Landscape 16:9 composition with one strong focal subject and useful lower-third negative space for subtitle overlays."
          : "Portrait mobile composition with one strong focal subject and useful negative space for subtitle overlays.",
        "Maintain a coherent color palette and visual world across the complete scene sequence.",
        "No text, letters, captions, logos, watermarks, celebrity likenesses, copyrighted characters, or childish classroom imagery.",
      ].join(" "),
      imageRef: null,
      durationSeconds: 5,
      altText: brief?.altText ?? `Visual scene ${sceneNumber} for ${topic}`,
      narrativeBeat: brief?.narrativeBeat,
    };
  });

  return { schemaVersion: 1, topicId, scenes };
}

export function planVisualScenesFromTopicBrief(
  brief: TopicBrief,
  visualStyle?: string,
  productionFormat: ProductionFormat = "short",
): VisualScenes {
  return planVisualScenes({
    topicId: brief.topicId,
    topic: brief.title,
    sceneCount: brief.visualOutline.length,
    visualOutline: brief.visualOutline,
    visualStyle,
    productionFormat,
  });
}
