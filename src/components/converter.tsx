import React, { useEffect, useState } from "react";
import * as jsfeat from 'jsfeat';

const OptFlowAnalyzer = () => {
};

type ConverterProps = {
  imageData: ImageData | null;
  onConvert: (averageVector: any) => void;
  width: number;
  height: number;
}

const Converter = ({imageData, onConvert, width, height}: ConverterProps) => {

  /**
	 * From jsfeat:
	 * "stop searching after the specified maximum number of iterations"
	 * 
	 * @type {Number}
	 */
	const max_iterations = 15;

	/**
	 * From jsfeat:
	 * "size of the search window at each pyramid level"
	 * 
	 * @type {Number}
	 */
	const win_size = 15;

	/**
	 * From jsfeat:
	 * "stop searching when the search window moves by less than eps"
	 * 
	 * @type {Number}
	 */
	const epsilon = 0.01;

	/**
	 * From jsfeat:
	 * "the algorithm calculates the minimum eigen value of a 2x2
	 * normal matrix of optical flow equations, divided by number of
	 * pixels in a window; if this value is less than min_eigen_threshold,
	 * then a corresponding feature is filtered out and its flow is not
	 * processed, it allows to remove bad points and get a performance boost"
	 * 
	 * @type {Number}
	 */
	const min_eigen = 0.001;

	/**
	 * Laplacian threshold for YAPE06 corner detection
	 * 
	 * @type {Number}
	 */
	const laplacian_threshold = 30;

	/**
	 * Min eigen value threshold for YAPE06 corner detection
	 * 
	 * @type {Number}
	 */
	const min_eigen_value_threshold = 25;

	/**
	 * From jsfeat:
	 * "previous frame 8-bit pyramid_t"
	 *
	 * @type {jsfeat.pyramid_t}
	 */
	const [prev_img_pyr, setprev_img_pyr] = useState(new jsfeat.pyramid_t(3));
	prev_img_pyr.allocate(width, height, jsfeat.U8_t|jsfeat.C1_t);

  /**
	 * From jsfeat:
	 * "current frame 8-bit pyramid_t"
	 *
	 * @type {jsfeat.pyramid_t}
	 */
	const [curr_img_pyr, setcurr_img_pyr] = useState(new jsfeat.pyramid_t(3));
  curr_img_pyr.allocate(width, height, jsfeat.U8_t|jsfeat.C1_t);
	/**
	 * From jsfeat:
	 * "number of input coordinates"
	 * 
	 * @type {Number}
	 */
	const [point_count, setpoint_count] = useState<number>(0);

	/**
	 * From jsfeat:
	 * "each element is set to 1 if the flow for the corresponding features
	 * has been found overwise 0"
	 * 
	 * @type {Uint8Array}
	 */
	const [point_status, setpoint_status] = useState(new Uint8Array(100));

	/**
	 * From jsfeat: 
	 * "Array of 2D coordinates for which the flow needs to be found"
	 * 
	 * @type {Float32Array}
	 */
	const [prev_xy, setprev_xy] = useState<Float32Array>(new Float32Array(100*2));

	/**
	 * From jsfeat:
	 * "Array of 2D coordinates containing the calculated new positions"
	 * 
	 * @type {Float32Array}
	 */
	const [curr_xy, setcurr_xy] = useState<Float32Array>(new Float32Array(100*2));

  /**
   * Parse the next image from the video using jsfeat's Lucas-Kanade
   * optical flow analysis tracker. Mimicking usage in 
   * https://inspirit.github.io/jsfeat/sample_oflow_lk.html
   */
  const parse = (imageData: ImageData) => {

    // swap flow data without creating new objects
    let _pt_xy = prev_xy;
    setprev_xy(curr_xy);
    setcurr_xy(_pt_xy);
    let _pyr = prev_img_pyr;
    setprev_img_pyr(curr_img_pyr);
    setcurr_img_pyr(_pyr);

    // Find all corners
    let matrix = prev_img_pyr.data[0];
    let corners: any[] = [];
    let i = imageData.width * imageData.height;
    while(i-- >= 0) {
      corners[i] = new jsfeat.keypoint_t(0,0,0,0);
    }
    jsfeat.yape06.laplacian_threshold = laplacian_threshold|0;
    jsfeat.yape06.min_eigen_value_threshold = min_eigen_value_threshold|0;
    jsfeat.yape06.detect(matrix, corners);

    // Sort corners descending by score
    corners = corners.sort((a, b) => {
      return b.score - a.score;
    });

    // Set top corners to previous coordinates
    let j = 0;
    setprev_xy(prev_xy.map((value, index) => {
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
    ));
    setpoint_count(j);
    
    // Make image grayscale for easier processing
    jsfeat.imgproc.grayscale(imageData.data, imageData.width, imageData.height, curr_img_pyr.data[0]);
    curr_img_pyr.build(curr_img_pyr.data[0], true);

    // TODO: This algorithm takes longer than anything else on the page. 
    // Attempt to optimize it by shifting the window size, max iterations, 
    // epsilon and min eigen values.
    jsfeat.optical_flow_lk.track(
      prev_img_pyr, 
      curr_img_pyr, 
      prev_xy, 
      curr_xy, 
      point_count, 
      win_size|0, 
      max_iterations|0, 
      point_status, 
      epsilon, 
      min_eigen
    );
  };

  const getAverageVector = function(curr_xy: any, prev_xy: any, point_count: number) {
    let summedVectors = curr_xy.reduce((runningTotals: number[], current: any, index: number) => {
      let diff = current - prev_xy[index];
  
      if (index % 2 === 0) {
        // if even index, then this is X vector
        runningTotals[0] += diff;
      } else {
        // else, a Y vector
        runningTotals[1] += diff;
      }
      return runningTotals;
    }, [0,0]);
    if (summedVectors.some((x: any) => x > 0)) {
      // TODO: why is this never hit
      console.log(" a change!! ");
    }
  
    return summedVectors.map((x: any) => x/point_count);
  };

  useEffect(() => {
    if (imageData) {
      parse(imageData);
    }
  }, [imageData]);

  useEffect(() => {
    onConvert(getAverageVector(curr_xy, prev_xy, point_count));
  }, [curr_xy]);

  return (<></>);
}

export default Converter;