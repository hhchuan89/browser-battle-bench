import appPackage from '../../package.json'
import webllmPackage from '@mlc-ai/web-llm/package.json'

export const APP_VERSION: string = appPackage.version ?? '0.0.0'
export const WEBLLM_VERSION: string = webllmPackage.version ?? 'unknown'
