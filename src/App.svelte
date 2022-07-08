<script lang="ts">
  import { doRedirect } from './../utils/redirect'
  import { WEB3AUTH_CLIENT_ID } from './../config/web3auth'
  import { Web3Auth } from '@web3auth/web3auth'
  import { CHAIN_NAMESPACES, SafeEventEmitterProvider } from '@web3auth/base'
  import { onMount } from 'svelte'
  import { dummyAccounts } from '../config/dummy-accounts'

  let clientId = WEB3AUTH_CLIENT_ID
  let web3Auth
  let provider
  let userInfo
  let hasDummyAccount = false

  const subscribeAuthEvents = web3auth => {
    web3auth.on('connected', data => {
      if (data) {
        getUserInfo()
      }
    })
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

        subscribeAuthEvents(web3Auth)

        await web3Auth.initModal()

        provider = web3Auth.provider
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
    provider = await web3Auth.connect()
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
