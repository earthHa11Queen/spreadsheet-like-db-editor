import apiClient from './axiosInstance';

export type ExportFormat = 'csv' | 'excel' | 'markdown';

/** A12: サーバーからテーブルデータをダウンロード */
export const exportApi = {
  exportTable: async (
    connectionId: number,
    tableName: string,
    format: ExportFormat,
    schema = 'public',
  ): Promise<void> => {
    const res = await apiClient.get(`/api/tables/${tableName}/export`, {
      params: { connectionId, format, schema },
      responseType: 'blob',
    });
    const ext = format === 'excel' ? 'xlsx' : format === 'markdown' ? 'md' : 'csv';
    const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15);
    const filename = `${tableName}_${ts}.${ext}`;
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
};

/**
 * クライアントサイドでグリッドの現在表示データを即時DL（未保存の編集内容も対象）
 */
export function exportRows(
  tableName: string,
  columns: string[],
  rows: Record<string, unknown>[],
  format: ExportFormat,
): void {
  const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15);

  if (format === 'csv') {
    const lines: string[] = [toCsvLine(columns)];
    for (const row of rows) {
      lines.push(toCsvLine(columns.map((c) => (row[c] == null ? '' : String(row[c])))));
    }
    const bom = '\uFEFF';
    const blob = new Blob([bom + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    download(blob, `${tableName}_${ts}.csv`);
    return;
  }

  if (format === 'markdown') {
    const sep = columns.map(() => '---').join(' | ');
    const lines = [
      '| ' + columns.join(' | ') + ' |',
      '| ' + sep + ' |',
      ...rows.map(
        (row) =>
          '| ' +
          columns
            .map((c) => (row[c] == null ? '' : String(row[c]).replace(/\|/g, '\\|')))
            .join(' | ') +
          ' |',
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    download(blob, `${tableName}_${ts}.md`);
    return;
  }

  // excel: TSV形式で.xlsxの代わりにCSVとして出力（ブラウザサイドはEasySpreadsheet不可）
  // フォールバック: CSVと同様に出力し拡張子のxlsxを付ける
  const lines: string[] = [toCsvLine(columns)];
  for (const row of rows) {
    lines.push(toCsvLine(columns.map((c) => (row[c] == null ? '' : String(row[c])))));
  }
  const bom = '\uFEFF';
  const blob = new Blob([bom + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  download(blob, `${tableName}_${ts}.csv`);
}

function toCsvLine(fields: string[]): string {
  return fields
    .map((v) => {
      if (v.includes(',') || v.includes('"') || v.includes('\n') || v.includes('\r')) {
        return '"' + v.replace(/"/g, '""') + '"';
      }
      return v;
    })
    .join(',');
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
