'use server';

import type { InvestigationOutput } from '@/types/investigation';
import { consultationOptions } from '@/config/investigationOptions';

const BASE_URL = "https://zero-two.online/consultas"; 

const removeUnwantedFieldsFromObject = (data: any): any => {
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    const { status, criador, by, ...rest } = data;
    return rest;
  }
  return data; 
};

const removeUnwantedFields = (data: any): any => {
  if (Array.isArray(data)) {
    return data.map(item => removeUnwantedFieldsFromObject(item));
  }
  return removeUnwantedFieldsFromObject(data);
};


export async function performInvestigation(rawQuery: string, endpoint: string): Promise<InvestigationOutput> {
  const apiKey = process.env.ZERO_TWO_API_KEY; 

  if (!apiKey) {
    console.error("[InvestigationService] CRITICAL ERROR: ZERO_TWO_API_KEY is not set.");
    return { success: false, error: "Chave de API para serviço de investigação não configurada no servidor.", queryType: endpoint || 'unknown_endpoint' };
  }

  const trimmedQuery = rawQuery.trim();
  if (!trimmedQuery) {
    return { success: false, error: "Termo de investigação não pode ser vazio.", queryType: endpoint };
  }

  if (!endpoint) {
    return { success: false, error: "Tipo de consulta para investigação não especificado.", queryType: 'not_specified' };
  }
  
  const selectedOption = consultationOptions.find(opt => opt.value === endpoint);
  const apiPath = selectedOption?.apiPath || endpoint;

  const url = `${BASE_URL}/${apiPath}?query=${encodeURIComponent(trimmedQuery)}&apikey=${apiKey}`;

  console.log(`[InvestigationService] Performing '${endpoint}' (path: '${apiPath}') investigation. Query (first 30): "${trimmedQuery.substring(0, 30)}...". URL (key masked): ${url.replace(apiKey, '***')}`);

  try {
    const response = await fetch(url, { method: 'GET', headers: {'Content-Type': 'application/json'} });

    let responseBodyText: string;
    let responseJson: any = null;

    try {
        responseBodyText = await response.text(); 
        if (response.headers.get("content-type")?.includes("application/json") && responseBodyText) {
            responseJson = JSON.parse(responseBodyText);
        }
    } catch (e) {
        console.error(`[InvestigationService] Error reading/parsing response body for query "${trimmedQuery.substring(0,30)}". Endpoint: ${endpoint}. Status: ${response.status}. Error: ${e}`);
        return { success: false, error: `Erro ao processar resposta da API de Investigação (${response.status}).`, queryType: endpoint };
    }
    
    if (!response.ok) {
      let errorDetail = `Status ${response.status}: ${response.statusText}.`;
      if (responseBodyText) {
        if (responseBodyText.toLowerCase().includes("<!doctype html") || responseBodyText.toLowerCase().includes("<html>")) {
            const titleMatch = responseBodyText.match(/<title>(.*?)<\/title>/i);
            const preMatch = responseBodyText.match(/<pre>(.*?)<\/pre>/is); 
            if (preMatch && preMatch[1] && preMatch[1].trim() !== "") {
                errorDetail = `Erro da API de Investigação (${response.status}): ${preMatch[1].trim().substring(0,150)}`;
            } else if (titleMatch && titleMatch[1] && titleMatch[1].trim() !== "") {
                 errorDetail = `Erro da API de Investigação (${response.status}): ${titleMatch[1].trim().substring(0,150)}`;
            } else {
                errorDetail = `Erro da API de Investigação (${response.status}): Resposta HTML recebida (sem detalhes claros).`;
            }
        } else if (responseJson && (responseJson.message || responseJson.error)) {
             errorDetail = `Erro da API de Investigação (${response.status}): ${(responseJson.message || responseJson.error).substring(0,150)}`;
        } else if (responseBodyText.length < 200 && responseBodyText.trim() !== "") {
             errorDetail = `Erro da API de Investigação (${response.status}): ${responseBodyText.substring(0,150)}`;
        } else {
             errorDetail = `Erro da API de Investigação (${response.status}): Detalhe não disponível ou muito longo.`;
        }
      }
      console.error(`[InvestigationService] API request failed for query "${trimmedQuery.substring(0,30)}" on endpoint '${endpoint}' (path: '${apiPath}') with status ${response.status}. Detail: ${errorDetail}. Full Body (truncated): ${responseBodyText.substring(0,500)}`);
      return { success: false, error: errorDetail, queryType: endpoint };
    }

    if (!responseJson) {
        console.warn(`[InvestigationService] API response for query "${trimmedQuery.substring(0,30)}" on endpoint '${endpoint}' (path: '${apiPath}') was not valid JSON or was empty, despite OK status. Body: ${responseBodyText.substring(0,200)}`);
        return { success: false, error: "API retornou uma resposta inesperada (não-JSON ou vazia).", queryType: endpoint };
    }
    
    const cleanedData = removeUnwantedFields(responseJson);

    if (responseJson && (responseJson.status === false || (typeof responseJson.success === 'boolean' && !responseJson.success))) {
      const message = responseJson.message || 'API reportou falha sem mensagem adicional.';
      console.warn(`[InvestigationService] API reported failure for query "${trimmedQuery.substring(0,30)}" on endpoint '${endpoint}' (path: '${apiPath}'): ${message}`);
      return { success: false, error: `Investigação: ${message.substring(0,150)}`, data: cleanedData, queryType: endpoint };
    }
    
    const isEmptyObject = typeof cleanedData === 'object' && cleanedData !== null && Object.keys(cleanedData).length === 0 && !Array.isArray(cleanedData);
    const isEmptyArray = Array.isArray(cleanedData) && cleanedData.length === 0;

    if (isEmptyObject || isEmptyArray) {
         const notFoundMessage = `Investigação: Nenhum resultado encontrado para '${endpoint}' com o valor fornecido.`;
         console.warn(`[InvestigationService] Investigation for '${endpoint}' (path: '${apiPath}') with query "${trimmedQuery.substring(0,30)}" returned no meaningful data after cleaning. Assuming not found.`);
         return { success: true, error: notFoundMessage, data: cleanedData, queryType: endpoint };
    }

    return { success: true, data: cleanedData, queryType: endpoint };

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(`[InvestigationService] Network or parsing error during investigation for query "${trimmedQuery.substring(0,30)}" on endpoint '${endpoint}' (path: '${apiPath}'):`, err);
    return { success: false, error: `Erro de Sistema ao Investigar: ${err.message.substring(0, 150)}`, queryType: endpoint || 'unknown_endpoint' };
  }
}
