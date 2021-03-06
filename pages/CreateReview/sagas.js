// @flow

// Rules on how to organize this file: https://github.com/erikras/ducks-modular-redux

import { fromJS } from 'immutable';
import { call, put, select, takeLatest } from 'redux-saga/effects';
import request from 'utils/request';
import { stringify } from 'qs';
import { EventTypes } from 'redux-segment';
import deepReplace from 'utils/deepReplace';
import encodeURI from 'utils/encodeURI';
import { API_URL, REQUESTED, SUCCEDED, FAILED, ERROR } from 'containers/constants';
import type { Action, State } from 'types/common';

// ------------------------------------
// Constants
// ------------------------------------
const GET_PRODUCTS = 'Lift/CreateReview/GET_PRODUCTS';
const GO_PAGE_STEP2 = 'Lift/App/Track/GO_PAGE_STEP2';
// ------------------------------------
// Actions
// ------------------------------------
export const requestProducts = (path: Object, keyword: string) => ({
  type: GET_PRODUCTS + REQUESTED,
  payload: keyword,
  meta: {
    path,
  },
});
const productsRequestSuccess = (payload: Object) => ({
  type: GET_PRODUCTS + SUCCEDED,
  payload,
});
const productsRequestFailed = (error) => ({
  type: GET_PRODUCTS + FAILED,
  payload: error,
});
const productsRequestError = (error) => ({
  type: GET_PRODUCTS + ERROR,
  payload: error,
});

export const trackPageStep2 = (business: string, product: string) => ({
  type: GO_PAGE_STEP2,
  meta: {
    analytics: [
      {
        eventType: EventTypes.track,
        eventPayload: {
          event: 'go-page-step2',
          properties: {
            business,
            product,
          },
        },
      },
    ],
  },
});
// ------------------------------------
// Reducer
// ------------------------------------
const initialState = fromJS({
  data: null,
  model: {
    page: 1,
    per_page: 12,
  },
  isLoading: false,
  error: '',
});

let newState = {};
export const reducer = (state: State = initialState, { type, payload, meta }: Action) => {
  switch (type) {
    case GET_PRODUCTS + REQUESTED:
      newState = state.set('isLoading', true);
      if (meta.path) return newState.setIn([...meta.path], fromJS(payload));
      return newState;

    case GET_PRODUCTS + SUCCEDED:
      return state
        .set('isLoading', false)
        .set('data', fromJS(payload))
        .set('error', '');

    case GET_PRODUCTS + FAILED:
      return state
        .set('isLoading', false)
        .set('error', payload);

    case GET_PRODUCTS + ERROR:
      return state
        .set('isLoading', false)
        .set('error', payload);

    default:
      return state;
  }
};

// ------------------------------------
// Selectors
// ------------------------------------
const getModel = (state) => deepReplace(state.getIn(['createReview', 'model']).toJS());

// ------------------------------------
// Sagas
// ------------------------------------
function* ProductsRequest() {
  const model = yield select(getModel.bind(null));
  const query = {};
  const { q } = model;
  if (q) {
    query.$text = { $search: q };
  }
  try {
    const response = yield call(request, { url: `${API_URL}/products?${stringify(model)}&query=${encodeURI(query)}&populate=business` });
    if (response.status === 200) {
      yield put(productsRequestSuccess(response.data));
    } else {
      yield put(productsRequestFailed(response.data.message));
    }
  } catch (error) {
    yield put(productsRequestError(error));
  }
}
function* productsWatcher(): Generator<Function, void, void> {
  yield takeLatest(GET_PRODUCTS + REQUESTED, ProductsRequest);
}

export default [
  productsWatcher,
];
