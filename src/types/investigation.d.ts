
export interface InvestigationOutput {
  success: boolean;
  data?: any;
  error?: string;
  queryType: string; 
}

export interface ConsultationOption {
  value: string;
  label: string;
  apiPath?: string; 
}
