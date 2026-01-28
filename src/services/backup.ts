// DEPRECATED - бэкапы больше не используются, данные в Supabase

export interface BackupData {
  version: string;
  exportDate: string;
  data: any;
}

export async function exportData(): Promise<BackupData> {
  return { version: '1.0', exportDate: new Date().toISOString(), data: {} };
}

export async function downloadBackup(): Promise<void> {
  console.log('Backup deprecated');
}

export async function importData(data: BackupData, mode: 'replace' | 'merge' = 'merge'): Promise<void> {
  console.log('Import deprecated');
}

export async function uploadBackup(file: File, mode: 'replace' | 'merge' = 'merge'): Promise<void> {
  console.log('Upload deprecated');
}

export async function autoBackup(): Promise<void> {
  // Не используется
}

export async function restoreAutoBackup(): Promise<boolean> {
  return false;
}

export function getLastAutoBackupDate(): string | null {
  return null;
}
