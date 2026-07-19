import { TestBed } from '@angular/core/testing';

import { StatusBar } from './status-bar';

describe('StatusBar', () => {
  let service: StatusBar;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StatusBar);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
