import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProcessingDisplayComponent } from './processing-display.component';

describe('ProcessingDisplayComponent', () => {
  let component: ProcessingDisplayComponent;
  let fixture: ComponentFixture<ProcessingDisplayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProcessingDisplayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProcessingDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
