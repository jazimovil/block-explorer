import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ExcaliburConnectComponent } from './excalibur-connect.component';

describe('ExcaliburConnectComponent', () => {
  let component: ExcaliburConnectComponent;
  let fixture: ComponentFixture<ExcaliburConnectComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ExcaliburConnectComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ExcaliburConnectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
