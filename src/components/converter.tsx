import * as jsfeat from 'jsfeat';
import { Vector } from '../types';

export class Converter {
  /**
	 * From jsfeat:
	 * "stop searching after the specified maximum number of iterations"
	 */
  max_iterations: number = 15;

  /**
	 * From jsfeat:
	 * "size of the search window at each pyramid level"
	 */
	win_size: number = 15;

	/**
	 * From jsfeat:
	 * "stop searching when the search window moves by less than eps"
	 */
	epsilon: number = 0.01;

  /**
	 * From jsfeat:
	 * "the algorithm calculates the minimum eigen value of a 2x2
	 * normal matrix of optical flow equations, divided by number of
	 * pixels in a window; if this value is less than min_eigen_threshold,
	 * then a corresponding feature is filtered out and its flow is not
	 * processed, it allows to remove bad points and get a performance boost"
	 */
	min_eigen: number = 0.001;

	/**
	 * Laplacian threshold for YAPE06 corner detection
	 */
  laplacian_threshold: number = 30;

	/**
	 * Min eigen value threshold for YAPE06 corner detection
	 */
  min_eigen_value_threshold: number = 25;

  /**
	 * From jsfeat:
	 * "previous frame 8-bit pyramid_t"
	 */
	prev_img_pyr = new jsfeat.pyramid_t(3);

  /**
	 * From jsfeat:
	 * "current frame 8-bit pyramid_t"
	 */
  curr_img_pyr = new jsfeat.pyramid_t(3);

  /**
	 * From jsfeat:
	 * "number of input coordinates"
	 */
	point_count = 0;

	/**
	 * From jsfeat:
	 * "each element is set to 1 if the flow for the corresponding features
	 * has been found overwise 0"
	 */
	point_status = new Uint8Array(100);

	/**
	 * From jsfeat: 
	 * "Array of 2D coordinates for which the flow needs to be found"
	 */
	prev_xy = new Float32Array(100*2);

	/**
	 * From jsfeat:
	 * "Array of 2D coordinates containing the calculated new positions"
	 */
	curr_xy = new Float32Array(100*2);
  
  /**
   * Whether we've allocated initial pyramids
   */
  initialized = false;

  /**
   * Parse the next image from the video using jsfeat's Lucas-Kanade
   * optical flow analysis tracker. Mimicking usage in 
   * https://inspirit.github.io/jsfeat/sample_oflow_lk.html
   */
  convertFrame(imageData: ImageData): Vector {
    const _getAverageVector = (curr_xy: any, prev_xy: any, point_count: number): Vector => {
      let summedVectors = curr_xy.reduce((runningTotals: Vector, current: any, index: number) => {
        let diff = current - prev_xy[index];
    
        if (index % 2 === 0) {
          // if even index, then this is X vector
          runningTotals.x += diff;
        } else {
          // else, a Y vector
          runningTotals.y += diff;
        }
        return runningTotals;
      }, {x: 0, y: 0});

      return { 
        x: summedVectors.x/point_count,
        y: summedVectors.y/point_count
      }
    };

    const _initialize = (width: number, height: number) => {
      this.prev_img_pyr.allocate(width, height, jsfeat.U8_t|jsfeat.C1_t);
      this.curr_img_pyr.allocate(width, height, jsfeat.U8_t|jsfeat.C1_t);
    };

    if (!this.initialized) {
      _initialize(imageData.width, imageData.height)
      this.initialized = true;
    }

    // swap flow data without creating new objects
    let _pt_xy = this.prev_xy;
    this.prev_xy = this.curr_xy;
    this.curr_xy = _pt_xy;
    let _pyr = this.prev_img_pyr;
    this.prev_img_pyr = this.curr_img_pyr;
    this.curr_img_pyr = _pyr;

    // Find all corners
    let matrix = this.prev_img_pyr.data[0];
    let corners: any[] = [];
    let i = imageData.width * imageData.height;
    while(i-- >= 0) {
      corners[i] = new jsfeat.keypoint_t(0,0,0,0);
    }
    jsfeat.yape06.laplacian_threshold = this.laplacian_threshold|0;
    jsfeat.yape06.min_eigen_value_threshold = this.min_eigen_value_threshold|0;
    jsfeat.yape06.detect(matrix, corners);

    // Sort corners descending by score
    corners = corners.sort((a, b) => {
      return b.score - a.score;
    });

    // Set top corners to previous coordinates
    let j = 0;
    this.prev_xy = this.prev_xy.map((value, index) => {
      if (index % 2 === 0) {
          // if even index, then place x integer
          return corners[j].x;
        } else {
          // else, place Y vector
          const newValue = corners[j].y;
          j++;
          return newValue;
        }
      }
    );
    this.point_count = j;
    
    // Make image grayscale for easier processing
    jsfeat.imgproc.grayscale(imageData.data, imageData.width, imageData.height, this.curr_img_pyr.data[0]);
    this.curr_img_pyr.build(this.curr_img_pyr.data[0], true);

    // TODO: This algorithm takes longer than anything else on the page. 
    // Attempt to optimize it by shifting the window size, max iterations, 
    // epsilon and min eigen values.
    jsfeat.optical_flow_lk.track(
      this.prev_img_pyr, 
      this.curr_img_pyr, 
      this.prev_xy, 
      this.curr_xy, 
      this.point_count, 
      this.win_size|0, 
      this.max_iterations|0, 
      this.point_status, 
      this.epsilon, 
      this.min_eigen
    );

    return _getAverageVector(this.curr_xy, this.prev_xy, this.point_count);
  }
}


export default function createConverter<T>(): Converter {
  const c = new Converter();
  return c;
}
