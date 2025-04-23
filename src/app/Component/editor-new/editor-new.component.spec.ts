import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditorNewComponent } from './editor-new.component';

describe('EditorNewComponent', () => {
  let component: EditorNewComponent;
  let fixture: ComponentFixture<EditorNewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditorNewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditorNewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
