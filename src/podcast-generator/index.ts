import { Actor, ActorState } from '@liquidmetal-ai/raindrop-framework';
import { Env } from './raindrop.gen.js';

export class PodcastGenerator extends Actor<Env> {
  constructor(state: ActorState, env: Env) {
    super(state, env);
  }
}
