import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { fabric } from 'fabric';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  color: string = '#5c37e1';
  modulus: number = 811;
  multiplier: number = 3;
  showLabels: boolean = false;
  showPoints: boolean = false;
  @ViewChild('header', { static: true }) headerRef: ElementRef | undefined;
  @ViewChild('button', { static: true }) buttonRef: ElementRef | undefined;

  ngOnInit(): void {
    this.drawVortex();
  }

  public adjustCheckboxUI(checkbox: HTMLInputElement) {
    let bgColor = checkbox.checked ? this.color : '#ffffff';
    let borderColor = checkbox.checked ? this.color : '#ced4da';
    checkbox.style.borderColor = borderColor;
    checkbox.style.backgroundColor = bgColor;
    if (checkbox.id == 'switch-labels') this.showLabels = checkbox.checked;
    if (checkbox.id == 'switch-points') this.showPoints = checkbox.checked;
  }

  adjustUI() {
    let header = <HTMLHeadElement>this.headerRef?.nativeElement;
    let button = <HTMLButtonElement>this.buttonRef?.nativeElement;
    header.style.color = this.color;
    button.style.borderColor = this.color;
    button.style.backgroundColor = this.color;
  }

  /* Add point labels and/or their text */
  private addPoint(
    canvas: fabric.Canvas,
    point: fabric.Point | null = null,
    label: { text: string; coords: fabric.Point } | null = null,
    radius: number = 5,
    fill: string | fabric.Gradient = 'blue'
  ) {
    if (point) {
      canvas.add(
        new fabric.Circle({
          top: point.y - radius,
          left: point.x - radius,
          fill: fill,
          radius: radius,
        })
      );
    }
    if (label) {
      let offsetX = 6 / label.text.length;
      canvas.add(
        new fabric.Text(label.text, {
          top: label.coords.y - 10,
          left: label.coords.x - 10 + offsetX,
          fontSize: 12,
          fontFamily: 'IBM Plex Mono',
        })
      );
    }
  }

  /* Computes point and text labels corresponding coordinate positions */
  getPointsLabels(startPt: fabric.Point, center: fabric.Point) {
    let rotAngle = fabric.util.degreesToRadians(360 / this.modulus);
    let points = [startPt];
    let labels = [
      {
        text: '0',
        coords: new fabric.Point(startPt.x, startPt.y - 20),
      },
    ];

    for (let i = 0; i < this.modulus; i++) {
      points.push(
        fabric.util.rotatePoint(points[points.length - 1], center, rotAngle)
      );
      labels.push({
        text: ((i + 1) % this.modulus) + '',
        coords: fabric.util.rotatePoint(
          labels[labels.length - 1].coords,
          center,
          rotAngle
        ),
      });
    }
    return { points: points, labels: labels };
  }

  /**
   *  Detect a cycle in the sequence (x^1, x^2, ..., x^i, ..., x^j) mod n
   *  where j > i. The cycle is detected when x^j = x^i for some i, j where
   *  j > i. Such finiteness is guaranteed since the number of distinct remainders
   *  of x^e mod n is at most n, for all non-negative integer values of e.
   * */
  detectedCycle(seq: number[]) {
    let seen = new Set();
    let i = 0;
    for (i = 0; i < seq.length; i++) {
      if (seen.has(seq[i])) break;
      seen.add(seq[i]);
    }
    seen = new Set();
    let result = [];
    while (i < seq.length) {
      if (seen.has(seq[i])) break;
      seen.add(seq[i]);
      result.push(seq[i]);
      i++;
    }
    return result;
  }

  digitSum(x: number, r: number): number {
    let result = 0;
    while (x > 0) {
      result += x % r;
      x = Math.floor(x / r);
    }
    return result;
  }

  digitRoot(x: number, r: number): number {
    let root = x;
    while (root >= r) {
      root = this.digitSum(root, r);
    }
    return root;
  }

  /**
   * Relies on the digital root property for dr(a * b) = dr(dr(a) * dr(b)).
   * This properties gives dr(x^n) = dr( dr(x)* dr(x^n-1))
   **/
  expDigitRoot(x: number, n: number, r: number): number {
    if (n == 0) return 1;
    if (n == 1) return this.digitRoot(x, r);
    return this.digitRoot(
      this.digitRoot(x, r) * this.expDigitRoot(x, n - 1, r),
      r
    );
  }

  /**
   * Efficiently calculates base^exp mod n for [possibly] large values of exp.
   * Various algorithms for modular exponentiation are explained on
   * Wikipedia: https://en.wikipedia.org/wiki/Modular_exponentiation
   **/
  expMod(base: number, exp: number, mod: number): number {
    if (mod == 1) return 0;
    let res = 1;
    while (exp > 0) {
      res = (res * base) % mod;
      exp--;
    }
    return res;
  }

  drawVortex(): void {
    this.adjustUI();
    let canvasSize: number =
      Math.min(window.innerWidth, window.innerHeight) - 200;
    let center: fabric.Point = new fabric.Point(canvasSize / 2, canvasSize / 2);
    let canvas: fabric.Canvas = new fabric.Canvas('canvas', {
      height: canvasSize,
      width: canvasSize,
    });

    /**
     * The finiteness of the loop relies on the idea explained in
     * detected_cycle comment (see above).
     **/
    let roots: number[] = [];
    for (let exp = 1; ; exp++) {
      let result = this.detectedCycle(roots);
      if (result.length != 0) break;
      roots.push(this.expMod(this.multiplier, exp, this.modulus));
      // roots.push(expDigitRoot(this.multiplier, exp, this.modulus));
    }

    let circle = new fabric.Circle({
      top: 50,
      left: 50,
      fill: 'transparent',
      stroke: 'black',
      strokeWidth: 1,
      radius: (canvasSize - 100) / 2,
    });
    canvas.add(circle);

    let { points, labels } = this.getPointsLabels(
      new fabric.Point(
        <number>circle.left + <number>circle.radius,
        <number>circle.top
      ),
      center
    );
    let setPoints = this.showPoints && this.modulus <= 200;
    let setLabels = this.showLabels && this.modulus <= 100;
    if (setPoints || setLabels) {
      let ptRadius = (0.4 * Math.PI * <number>circle.radius) / this.modulus;
      for (let i = 0; i < points.length - 1; i++) {
        this.addPoint(
          canvas,
          setPoints ? points[i] : null,
          setLabels ? labels[i] : null,
          Math.min(ptRadius, 5),
          this.color
        );
      }
    }

    for (
      let i = roots.indexOf(roots[roots.length - 1]);
      i < roots.length - 1;
      i++
    ) {
      let start = points[roots[i]];
      let end = points[roots[i + 1]];
      try {
        canvas.add(
          new fabric.Line([start.x, start.y, end.x, end.y], {
            stroke: this.color,
            strokeWidth: 1,
          })
        );
      } catch (error) {
        console.error(error, start, end);
      }
    }
  }
}
