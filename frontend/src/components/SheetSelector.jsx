import { FileSpreadsheet, ChevronDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

export const SheetSelector = ({ sheets = [], activeSheet, onSheetChange }) => {
  if (sheets.length <= 1) return null;

  return (
    <div className="flex items-center gap-2">
      <FileSpreadsheet className="w-4 h-4 text-zinc-500" />
      <Select value={activeSheet} onValueChange={onSheetChange}>
        <SelectTrigger 
          data-testid="sheet-selector"
          className="w-[200px] bg-white"
        >
          <SelectValue placeholder="Select sheet" />
        </SelectTrigger>
        <SelectContent>
          {sheets.map(sheet => (
            <SelectItem key={sheet} value={sheet}>
              {sheet}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
