import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'initials',
  standalone: false
})
export class InitialsPipe implements PipeTransform {
  transform(value: string | undefined | null): string {
    if (!value) return '?';
    const trimmed = value.trim();
    if (!trimmed) return '?';
    
    // Split by space and get first character of up to two words
    const parts = trimmed.split(/\s+/);
    if (parts.length > 1) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return trimmed.charAt(0).toUpperCase();
  }
}
