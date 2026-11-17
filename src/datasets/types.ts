export interface ColumnMetadata {
  name: string;
  type: string;
  description: string;
  nullable: boolean;
}

export type DatasetFrequency =
  "Mensual" | "Trimestral" | "Semestral" | "Anual" | "Estática / Diccionario";

export interface DatasetMetadata {
  id: string;
  endpoint: string;
  summary: string;
  description: string;
  area: string;
  frecuencia: DatasetFrequency;
  columns: ColumnMetadata[];
  orderKeys: string[];
  dateColumns: string[];
}
