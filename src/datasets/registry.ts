import { DATASETS, DATASET_LIST } from "./registry.generated.js";
import type { DatasetFrequency, DatasetMetadata } from "./types.js";

export interface DatasetSearchCriteria {
  area?: string;
  frecuencia?: DatasetFrequency;
  search?: string;
}

export class DatasetRegistry {
  private readonly datasets: DatasetMetadata[];
  private readonly byId: Record<string, DatasetMetadata>;

  constructor(
    datasets: DatasetMetadata[] = DATASET_LIST,
    byId: Record<string, DatasetMetadata> = DATASETS
  ) {
    this.datasets = datasets;
    this.byId = byId;
  }

  list(): DatasetMetadata[] {
    return this.datasets;
  }

  get(idOrEndpoint: string): DatasetMetadata | undefined {
    const cleanId = idOrEndpoint.replace(/^\//, "").trim();
    if (this.byId[cleanId]) {
      return this.byId[cleanId];
    }
    const normalized = cleanId.replace(/_/g, "-");
    return this.datasets.find(
      (d) => d.id === cleanId || d.id.replace(/_/g, "-") === normalized
    );
  }

  search(criteria: DatasetSearchCriteria = {}): DatasetMetadata[] {
    let result = this.datasets;

    if (criteria.frecuencia) {
      result = result.filter((d) => d.frecuencia === criteria.frecuencia);
    }

    if (criteria.area) {
      const lowerArea = criteria.area.toLowerCase();
      result = result.filter((d) => d.area.toLowerCase().includes(lowerArea));
    }

    if (criteria.search) {
      const lowerSearch = criteria.search.toLowerCase();
      result = result.filter(
        (d) =>
          d.id.toLowerCase().includes(lowerSearch) ||
          d.summary.toLowerCase().includes(lowerSearch) ||
          d.description.toLowerCase().includes(lowerSearch)
      );
    }

    return result;
  }

  /**
   * Sugerencias para un id mal escrito. Coincide por id completo o por
   * tokens separados por guiones/underscores.
   */
  suggest(idOrEndpoint: string): string[] {
    const query = idOrEndpoint.toLowerCase().replace(/^\//, "");
    const tokens = query.split(/[-_]/).filter((t) => t.length >= 2);

    return this.datasets
      .filter((d) => {
        const idLower = d.id.toLowerCase();
        return (
          idLower.includes(query) ||
          query.includes(idLower) ||
          tokens.some((token) => idLower.includes(token))
        );
      })
      .slice(0, 5)
      .map((d) => d.id);
  }
}
