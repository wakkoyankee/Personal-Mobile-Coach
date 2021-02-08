//Singleton to access the deep learning model
import * as tf from '@tensorflow/tfjs';
import {bundleResourceIO} from './bundle_resource_io';
import { Buffer } from 'buffer';

const modelJson2 = require('../assets/model.json');
const modelWeights2 = require('../assets/group1-shard1of1.bin');

export default class ModelManager {

  static myInstance = null;
  _prediction = null;
  _model = null;

  /**
   * @returns {ModelManager}
   */
  static getInstance() {
      if (ModelManager.myInstance == null) {
        ModelManager.myInstance = new ModelManager();
      }
      return this.myInstance;
  }

  /**
   * Loads tfjs and the model
   */
  async Load(){
    await tf.ready();
    this._model = await tf.loadGraphModel(bundleResourceIO(modelJson2, modelWeights2));
    this._prediction = 0;
    console.log(this._model);
  }

  /**
   * Use the model
   * @param input arrays made in BgTracking
   * @returns prediction
   */
  async getPrediction(input) {
      var a = tf.tensor(input);
      a = tf.reshape(a,[-1,50,7]);
      const res = await this._model.executeAsync(a);
      const data = await res.data();

      return data[0];
  }
}

