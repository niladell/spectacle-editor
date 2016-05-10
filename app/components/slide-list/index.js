import React, { Component } from "react";
import { findDOMNode } from "react-dom";
import { observer } from "mobx-react";
import { Motion, spring } from "react-motion";

import SlideTile from "./slide-tile";
import styles from "./index.css";

// TODO: REMOVE
const allColors = [
  '#EF767A', '#456990', '#49BEAA', '#49DCB1', '#EEB868', '#EF767A', '#456990',
  '#49BEAA', '#49DCB1', '#EEB868', '#EF767A',
];

// NOTE: These must match up to the actual styles.
const slideHeight = 65;
// NOTE: These are half the value since vertical margins collapse
const slideTopMargin = 5;
const slideBottomMargin = 5;
// Vertical margins collapse so add one more topMargin to the start.
const listTop = 50 + slideTopMargin;
const listBottom = 900;
const listRight = 155;
const listLeft = 5;
const totalSlideHeight = slideHeight + slideTopMargin + slideBottomMargin;

const springSetting1 = { stiffness: 180, damping: 10 };
const springSetting2 = { stiffness: 1000, damping: 50 };

// NOTE: If dragging hits perf issues, memoize this function
// TODO: HANDLE SCROLL!
const getDragIndex = (topOfSlide, currentDragIndex) => {
  const effectiveTop = topOfSlide - listTop;
  const interSlideTop = effectiveTop % totalSlideHeight;

  let index = Math.floor(effectiveTop / totalSlideHeight);

  // Account for margins
  if (index < currentDragIndex && interSlideTop > slideTopMargin) {
    index += 1;
  } else if (index > currentDragIndex && interSlideTop <= slideTopMargin) {
    index -= 1;
  }

  return index;
};

@observer
class SlideList extends Component {
  static contextTypes = {
    store: React.PropTypes.object
  };

  constructor(props, context) {
    super(props);

    this.state = {
      slideList: context.store.slides,
      boundingRect: null,
      mouseStart: [0, 0],
      delta: [0, 0], // difference between mouse and circle pos, for dragging
      outside: false, // index of component outside
      isPressed: false
    };
  }

  handleTouchStart = (id, pressLocation, ev) => {
    this.handleMouseDown(id, pressLocation, ev.touches[0]);
  }

  handleTouchMove = (ev) => {
    ev.preventDefault();
    this.handleMouseMove(ev.touches[0]);
  }

  handleMouseMove = ({ pageX, pageY }) => {
    const { mouseOffset, mouseStart: [x, y], currentDragIndex } = this.state;

    const newDelta = [pageX - x, pageY - y];
    const topOfSlide = pageY + mouseOffset.top;
    const leftOfSlide = pageX + mouseOffset.left;
    const rightOfSlide = pageX + mouseOffset.right;

    // Let the slide overflow halfway for the zero index location.
    if (topOfSlide < listTop && topOfSlide > listTop - (slideHeight / 2)) {
      console.log("HERE");

      this.setState({
        delta: newDelta,
        currentDragIndex: 0,
        outside: false
      });

      return;
    }

    // If we're outside of the column, setState to outside
    // TODO: GET ACTUAL COLUMN COORDINATES, use list boundingRect and slide bounding rect
    if (
      rightOfSlide < listLeft ||
      leftOfSlide > listRight ||
      topOfSlide > listBottom ||
      topOfSlide < listTop
    ) {
      this.setState({
        delta: newDelta,
        outside: true
      });

      return;
    }

    let newIndex = getDragIndex(topOfSlide, currentDragIndex);

    const slides = this.context.store.slides;

    // Safety check
    if (newIndex > slides.length) {
      newIndex = slides.length - 1;
    }

    this.setState({
      delta: newDelta,
      currentDragIndex: newIndex,
      outside: false
    });
  }

  handleMouseDown = (id, index, ev) => {
    ev.preventDefault();

    const { pageX, pageY } = ev;
    const { top, right, bottom, left } = this[id].getBoundingClientRect();

    this.setState({
      originalDragIndex: index,
      currentDragIndex: index,
      mouseOffset: {
        top: top - pageY,
        right: right - pageX,
        bottom: bottom - pageY,
        left: left - pageX
      },
      delta: [0, 0],
      mouseStart: [pageX, pageY]
    });

    window.addEventListener("touchmove", this.handleTouchMove);
    window.addEventListener("touchend", this.handleMouseUp);
    window.addEventListener("mousemove", this.handleMouseMove);
    window.addEventListener("mouseup", this.handleMouseUp);
  }

  handleMouseUp = () => {
    this.setState({
      originalDragIndex: null,
      currentDragIndex: null,
      outside: false,
      boundingRect: null,
      delta: [0, 0]
    });

    window.removeEventListener("touchmove", this.handleTouchMove);
    window.removeEventListener("touchend", this.handleMouseUp);
    window.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("mouseup", this.handleMouseUp);
  }

  // onMoveSlide = (originalIndex, newIndex) => {
  //   // this.context.store.moveSlide(originalIndex, newIndex);
  // }

  // onDropSlide = (originalIndex, newIndex) => {
  //   // TODO: Commit to history here
  // }



  render() {
    const { slideList, currentDragIndex, delta, outside, originalDragIndex } = this.state;

    // If we're outside the column, fill in the vacant spot
    let visualIndex = 0;

    return (
      <div className={styles.list}>
        {slideList.map((slide, i) => {
          let style;
          let x;
          let y;

          // Leave a space in this location if we're within column bounds
          if (!outside && visualIndex === currentDragIndex) {
            visualIndex += 1;
          }

          if (i === originalDragIndex) {
            [x, y] = delta;

            style = {
              translateX: spring(x, springSetting2),
              translateY: spring(y, springSetting2),
              scale: spring(1.1, springSetting1),
              zIndex: 1000
            };
          } else {
            y = (visualIndex - i) * totalSlideHeight;
            visualIndex += 1;

            style = {
              translateX: spring(0, springSetting2),
              translateY: spring(y, springSetting2),
              scale: 1,
              zIndex: i
            };
          }

          return (
            <Motion key={slide.id} style={style}>
              {({ translateY, translateX, scale, zIndex }) => (
                <div
                  className={styles.slideWrapper}
                  ref={(ref) => { this[slide.id] = ref; }}
                  key={slide.id}
                  onMouseDown={this.handleMouseDown.bind(this, slide.id, i)}
                  onTouchStart={this.handleTouchStart.bind(this, slide.id, i)}
                  style={{
                    zIndex,
                    margin: 10,
                    backgroundColor: allColors[i],
                    transform: `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`
                  }}
                >
                  <div className={styles.slideThumb}>{slide.id}</div>
                </div>
              )}
            </Motion>
          );
        })}
      </div>
    );
  }
}

export default SlideList;