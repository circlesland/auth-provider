<script lang="ts">
  import { doRedirect } from './../utils/redirect'
  import { WEB3AUTH_CLIENT_ID } from './../config/web3auth'
  import { Web3Auth } from '@web3auth/web3auth'
  import { CHAIN_NAMESPACES, SafeEventEmitterProvider } from '@web3auth/base'
  import { onMount } from 'svelte'
  import { DIDDataStore } from '@glazed/did-datastore'
  import { dummyAccounts } from '../config/dummy-accounts'
  import Web3 from 'web3'
  import { DIDSession } from '@glazed/did-session'
  import { CeramicClient } from '@ceramicnetwork/http-client'
  import { Ed25519Provider } from 'key-did-provider-ed25519'
  import { Orbis } from '@orbisclub/orbis-sdk'
  import { EthereumAuthProvider } from '@ceramicnetwork/blockchain-utils-linking'
  import KeyResolver from 'key-did-resolver'
  import { DID } from 'dids'
  import { ethers, Wallet } from 'ethers'

  const ceramic = new CeramicClient('https://ceramic-clay.3boxlabs.com')

  const aliases = {
    schemas: {
      basicProfile:
        'ceramic://k3y52l7qbv1frxt706gqfzmq6cbqdkptzk8uudaryhlkf6ly9vx21hqu4r6k1jqio'
    },
    definitions: {
      BasicProfile: 'kjzl6cwe1jw145cjbeko9kil8g9bxszjhyde21ob8epxuxkaon1izyqsu8wgcic'
    },
    tiles: {}
  }

  const datastore = new DIDDataStore({ ceramic, model: aliases })

  let orbis = new Orbis()
  let clientId = WEB3AUTH_CLIENT_ID
  let web3Auth: Web3Auth
  let provider
  let userInfo
  let hasDummyAccount = false
  let userDid

  async function connect(provider) {
    let res = await orbis.connect(provider)

    /** Check if connection is successful or not */
    if (res.status == 200) {
      console.log(res.did)
      userDid = res.did
    } else {
      console.log('Error connecting to Ceramic: ', res)
      alert('Error connecting to Ceramic.')
    }
  }

  const subscribeAuthEvents = web3auth => {
    web3auth.on('connected', data => {
      if (data) {
        if (!new URL(window.location.toString()).searchParams.get('logout')) {
          continueToApp()
        }
      }
    })

    web3auth.on('MODAL_VISIBILITY', isVisible => {
      if (!isVisible) {
        doRedirect()
      }
    })
  }

  const createProvider = async () => {
    const privKey: string = await web3Auth.provider.request({
      method: 'eth_private_key'
    })

    const privateKeyBuffer = new Uint8Array(Buffer.from(privKey, 'hex'))
    const signKey = new ethers.utils.SigningKey(privateKeyBuffer)

    const publicKeyBuffer = new Uint8Array(Buffer.from(signKey.publicKey, 'hex'))

    const provider = new Ed25519Provider(privateKeyBuffer, publicKeyBuffer)

    return provider
  }

  onMount(() => {
    const init = async () => {
      try {
        web3Auth = new Web3Auth({
          clientId,
          chainConfig: {
            chainNamespace: CHAIN_NAMESPACES.EIP155
          }
        })

        // subscribeAuthEvents(web3Auth) // TODO: add this back

        await web3Auth.initModal()

        await login()

        provider = web3Auth.provider

        // @ts-ignore
        // const web3Provider = new Web3(_provider)
        // const accounts = await web3Provider.eth.getAccounts()

        // const ethersProvider = new EthereumAuthProvider(
        //   web3Provider.currentProvider,
        //   accounts[0]
        // )

        // const session = new DIDSession({ authProvider: ethersProvider })

        // console.log('DIDSession', session)

        // const did = await session.authorize()

        const _provider = await createProvider()
        const did = new DID({ provider: _provider, resolver: KeyResolver.getResolver() })
        await did.authenticate()

        ceramic.setDID(did)

        const profile = await datastore.get('BasicProfile')

        if (!profile) {
          const str = await datastore.merge('BasicProfile', {
            name: 'John Doe',
            country: 'USA'
          })
          console.log(str)
        } else {
          console.log('my profile', profile)
        }
      } catch (error) {
        console.error('err', error)
      }
    }

    init()

    if (new URL(window.location.toString()).searchParams.get('test_account')) {
      hasDummyAccount = true
    }
  })

  const login = async () => {
    if (!web3Auth) {
      console.log('web3auth not initialized yet')
      return
    }

    const provider = await web3Auth.connect()

    return provider
  }

  const logout = async () => {
    if (!web3Auth) {
      console.log('web3auth not initialized yet')
      return
    }
    await web3Auth.logout()
    provider = null
  }

  const getUserInfo = async () => {
    if (!web3Auth) {
      console.log('web3auth not initialized yet')
      return
    }
    const user = await web3Auth.getUserInfo()
    userInfo = user ? user.email : ''
  }

  const continueToApp = async () => {
    const url = new URL(window?.location.toString())
    const urlParams = url.searchParams

    if (urlParams.has('test_account')) {
      const accountIndex = parseInt(urlParams.get('test_account'))
      const base64UserData = dummyAccounts[accountIndex]

      doRedirect(base64UserData)
    } else {
      const privKey = await web3Auth.provider.request({
        method: 'eth_private_key'
      })

      const userDataLocalStorage = JSON.stringify({
        ...localStorage,
        privateKey: privKey
      })

      const base64UserData = btoa(userDataLocalStorage)

      logout()

      doRedirect(base64UserData)
    }
  }
</script>

<meta name="viewport" content="width=device-width, initial-scale=1.0" />

<div style="margin-top: 100px;">
  <p>{userInfo}</p>
  {#if !provider}
    <button on:click={login}>Login</button>
  {:else}
    <button on:click={logout}>Logout</button>
  {/if}
  <button on:click={getUserInfo}>User Info</button>

  {#if userInfo || hasDummyAccount}
    <div class="mt-8"><button on:click={continueToApp}>Continue to App</button></div>
  {/if}
</div>
