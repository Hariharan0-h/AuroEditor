import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuroEditorComponent } from './auro-editor.component';

describe('AuroEditorComponent', () => {
  let component: AuroEditorComponent;
  let fixture: ComponentFixture<AuroEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuroEditorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AuroEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
