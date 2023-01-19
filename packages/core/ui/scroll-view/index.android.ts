import { ScrollEventData } from '.';
import { ScrollViewBase, scrollBarIndicatorVisibleProperty, isScrollEnabledProperty } from './scroll-view-common';
import { layout } from '../../utils';
import { isUserInteractionEnabledProperty } from '../core/view';

export * from './scroll-view-common';

export class ScrollView extends ScrollViewBase {
	nativeViewProtected: org.nativescript.widgets.VerticalScrollView | org.nativescript.widgets.HorizontalScrollView;
	private _androidViewId = -1;
	private handler: android.view.ViewTreeObserver.OnScrollChangedListener;
	private scrollChangeHandler: androidx.core.widget.NestedScrollView.OnScrollChangeListener;

	get horizontalOffset(): number {
		const nativeView = this.nativeViewProtected;
		if (!nativeView) {
			return 0;
		}

		return nativeView.getScrollX() / layout.getDisplayDensity();
	}

	get verticalOffset(): number {
		const nativeView = this.nativeViewProtected;
		if (!nativeView) {
			return 0;
		}

		return nativeView.getScrollY() / layout.getDisplayDensity();
	}

	get scrollableWidth(): number {
		const nativeView = this.nativeViewProtected;
		if (!nativeView || this.orientation !== 'horizontal') {
			return 0;
		}

		return nativeView.getScrollableLength() / layout.getDisplayDensity();
	}

	get scrollableHeight(): number {
		const nativeView = this.nativeViewProtected;
		if (!nativeView || this.orientation !== 'vertical') {
			return 0;
		}

		return nativeView.getScrollableLength() / layout.getDisplayDensity();
	}

	[isUserInteractionEnabledProperty.setNative](value: boolean) {
		// NOTE: different behavior on iOS & Android:
		// iOS disables user interaction recursively for all subviews as well
		this.nativeViewProtected.setClickable(value);
		this.nativeViewProtected.setFocusable(value);
		this.nativeViewProtected.setScrollEnabled(value);
	}

	[isScrollEnabledProperty.getDefault](): boolean {
		return this.nativeViewProtected.getScrollEnabled();
	}
	[isScrollEnabledProperty.setNative](value: boolean) {
		this.nativeViewProtected.setScrollEnabled(value);
	}

	[scrollBarIndicatorVisibleProperty.getDefault](): boolean {
		return true;
	}
	[scrollBarIndicatorVisibleProperty.setNative](value: boolean) {
		if (this.orientation === 'horizontal') {
			this.nativeViewProtected.setHorizontalScrollBarEnabled(value);
		} else {
			this.nativeViewProtected.setVerticalScrollBarEnabled(value);
		}
	}

	public scrollToVerticalOffset(value: number, animated: boolean) {
		const nativeView = this.nativeViewProtected;
		if (nativeView && this.orientation === 'vertical' && this.isScrollEnabled) {
			value *= layout.getDisplayDensity();

			if (animated) {
				nativeView.smoothScrollTo(0, value);
			} else {
				nativeView.scrollTo(0, value);
			}
		}
	}

	public scrollToHorizontalOffset(value: number, animated: boolean) {
		const nativeView = this.nativeViewProtected;
		if (nativeView && this.orientation === 'horizontal' && this.isScrollEnabled) {
			value *= layout.getDisplayDensity();

			if (animated) {
				nativeView.smoothScrollTo(value, 0);
			} else {
				nativeView.scrollTo(value, 0);
			}
		}
	}

	public createNativeView() {
		if (this.orientation === 'horizontal') {
			return new org.nativescript.widgets.HorizontalScrollView(this._context);
		} else {
			const view = new org.nativescript.widgets.VerticalScrollView(this._context);
			view.setVerticalScrollBarEnabled(true);
			return view;
		}
	}

	public initNativeView(): void {
		super.initNativeView();
		console.log('initNativeView');
		if (this._androidViewId < 0) {
			this._androidViewId = android.view.View.generateViewId();
		}

		this.nativeViewProtected.setId(this._androidViewId);
	}

	protected addNativeListener() {
		console.log('addNativeListener');
		if (!this.nativeViewProtected) {
			return;
		}
		const that = new WeakRef(this);
		if (this.orientation === 'vertical') {
			this.scrollChangeHandler = new androidx.core.widget.NestedScrollView.OnScrollChangeListener({
				onScrollChange(view, scrollX, scrollY) {
					const owner: ScrollView = that?.get();
					if (owner) {
						owner.notify({
							object: owner,
							eventName: ScrollView.scrollEvent,
							scrollX: layout.toDeviceIndependentPixels(scrollX),
							scrollY: layout.toDeviceIndependentPixels(scrollY),
						});
					}
				},
			});
			this.nativeViewProtected.setOnScrollChangeListener(this.scrollChangeHandler);
		} else {
			this.handler = new android.view.ViewTreeObserver.OnScrollChangedListener({
				onScrollChanged: function () {
					const owner: ScrollView = that?.get();
					if (owner) {
						owner._onScrollChanged();
					}
				},
			});
			this.nativeViewProtected.getViewTreeObserver().addOnScrollChangedListener(this.handler);
		}
	}

	protected removeNativeListener() {
		if (!this.nativeViewProtected) {
			return;
		}
		if (this.handler) {
			this.nativeViewProtected?.getViewTreeObserver().removeOnScrollChangedListener(this.handler);
			this.handler = null;
		}
		if (this.scrollChangeHandler) {
			this.nativeView?.setOnScrollChangeListener(null);
			this.scrollChangeHandler = null;
		}
	}

	disposeNativeView() {
		this.removeNativeListener();
		super.disposeNativeView();
	}

	public _onOrientationChanged() {
		if (this.nativeViewProtected) {
			const parent = this.parent;
			if (parent) {
				parent._removeView(this);
				parent._addView(this);
			}
		}
	}

	private _lastScrollX = -1;
	private _lastScrollY = -1;
	private _onScrollChanged() {
		const nativeView = this.nativeViewProtected;
		if (nativeView) {
			// Event is only raised if the scroll values differ from the last time in order to wokraround a native Android bug.
			// https://github.com/NativeScript/NativeScript/issues/2362
			const newScrollX = nativeView.getScrollX();
			const newScrollY = nativeView.getScrollY();
			if (newScrollX !== this._lastScrollX || newScrollY !== this._lastScrollY) {
				this.notify(<ScrollEventData>{
					object: this,
					eventName: ScrollView.scrollEvent,
					scrollX: newScrollX / layout.getDisplayDensity(),
					scrollY: newScrollY / layout.getDisplayDensity(),
				});
				this._lastScrollX = newScrollX;
				this._lastScrollY = newScrollY;
			}
		}
	}
}

ScrollView.prototype.recycleNativeView = 'never';
