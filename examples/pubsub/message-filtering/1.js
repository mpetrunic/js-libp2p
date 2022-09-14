/* eslint-disable no-console */

import { createLibp2p } from 'libp2p'
import { TCP } from '@libp2p/tcp'
import { Mplex } from '@libp2p/mplex'
import { Noise } from '@chainsafe/libp2p-noise'
import { FloodSub } from '@libp2p/floodsub'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'

const createNode = async () => {
  const node = await createLibp2p({
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0']
    },
    transports: [new TCP()],
    streamMuxers: [new Mplex()],
    connectionEncryption: [new Noise()],
    pubsub: new FloodSub()
  })

  await node.start()
  return node
}

(async () => {
  const topic = 'fruit'

  const [node1, node2, node3] = await Promise.all([
    createNode(),
    createNode(),
    createNode(),
  ])

  // node1 conect to node2 and node2 conect to node3
  await node1.peerStore.addressBook.set(node2.peerId, node2.getMultiaddrs())
  await node1.dial(node2.peerId)

  await node2.peerStore.addressBook.set(node3.peerId, node3.getMultiaddrs())
  await node2.dial(node3.peerId)

  //subscribe
  node1.pubsub.addEventListener('message', (evt) => {
    if (evt.detail.topic !== topic) {
      return
    }

    // Will not receive own published messages by default
    console.log(`node1 received: ${uint8ArrayToString(evt.detail.data)}`)
  })
  node1.pubsub.subscribe(topic)

  node2.pubsub.addEventListener('message', (evt) => {
    if (evt.detail.topic !== topic) {
      return
    }

    console.log(`node2 received: ${uint8ArrayToString(evt.detail.data)}`)
  })
  node2.pubsub.subscribe(topic)

  node3.pubsub.addEventListener('message', (evt) => {
    if (evt.detail.topic !== topic) {
      return
    }

    console.log(`node3 received: ${uint8ArrayToString(evt.detail.data)}`)
  })
  node3.pubsub.subscribe(topic)

  // wait for subscriptions to propagate
  await delay(1000)

  const validateFruit = (msgTopic, msg) => {
    const fruit = uint8ArrayToString(msg.data)
    const validFruit = ['banana', 'apple', 'orange']

    // car is not a fruit !
    if (!validFruit.includes(fruit)) {
      throw new Error('no valid fruit received')
    }
  }

  //validate fruit
  node1.pubsub.topicValidators.set(topic, validateFruit)
  node2.pubsub.topicValidators.set(topic, validateFruit)
  node3.pubsub.topicValidators.set(topic, validateFruit)

  // node1 publishes "fruits"
  for (const fruit of ['banana', 'apple', 'car', 'orange']) {
    console.log('############## fruit ' + fruit + ' ##############')
    await node1.pubsub.publish(topic, uint8ArrayFromString(fruit))
  }

  // wait a few seconds for messages to be received
  await delay(5000)
  console.log('############## all messages sent ##############')
})()

async function delay (ms) {
  await new Promise((resolve) => {
    setTimeout(() => resolve(), ms)
  })
}