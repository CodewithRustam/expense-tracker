import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'firstName',
  standalone: false
})
export class FirstNamePipe implements PipeTransform {
  transform(value: string | undefined | null): string {
    if (!value) return '';
    const trimmed = value.trim();
    if (!trimmed) return '';
    
    // Split by space and return the first part
    return trimmed.split(/\s+/)[0];
  }
}
