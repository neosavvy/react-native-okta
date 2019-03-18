import React, { Component } from 'react';
import { Alert, UIManager, LayoutAnimation, StyleSheet } from 'react-native';
import { authorize, refresh, revoke } from 'react-native-app-auth';
import { Page, Button, ButtonContainer, Form, Heading } from './components';

import { RNCamera } from 'react-native-camera';
import TouchID from 'react-native-touch-id';
import CenteredButtonContainer from "./components/FloatingButtonContainer";

import firebase from 'react-native-firebase';

UIManager.setLayoutAnimationEnabledExperimental && UIManager.setLayoutAnimationEnabledExperimental(true);

type State = {
  viewState: ?number,
  hasLoggedInOnce: boolean,
  accessToken: ?string,
  accessTokenExpirationDate: ?string,
  refreshToken: ?string
};

const config = {
  issuer: 'https://dev-600414-admin.okta.com/oauth2/default',
  clientId: '0oackip0cFLGTAIgq356',
  redirectUrl: 'com.okta.dev-600414:/callback',
  additionalParameters: {},
  scopes: ['openid', 'profile', 'email', 'offline_access']
};

export default class App extends Component<{}, State> {
  state = {
    hasLoggedInOnce: false,
    accessToken: '',
    accessTokenExpirationDate: '',
    refreshToken: '',
    idToken: '',
  };

  animateState(nextState: $Shape<State>, delay: number = 0) {
    setTimeout(() => {
      this.setState(() => {
        LayoutAnimation.easeInEaseOut();
        return nextState;
      });
    }, delay);
  }

  authorize = async () => {
    try {
      const authState = await authorize(config);
      this.animateState(
          {
            hasLoggedInOnce: true,
            accessToken: authState.accessToken,
            accessTokenExpirationDate: authState.accessTokenExpirationDate,
            refreshToken: authState.refreshToken,
            idToken: authState.idToken
          },
          500
      );
    } catch (error) {
      Alert.alert('Failed to log in', error.message);
    }
  };

  refresh = async () => {
    try {
      const authState = await refresh(config, {
        refreshToken: this.state.refreshToken
      });

      this.animateState({
        accessToken: authState.accessToken || this.state.accessToken,
        accessTokenExpirationDate:
            authState.accessTokenExpirationDate || this.state.accessTokenExpirationDate,
        refreshToken: authState.refreshToken || this.state.refreshToken
      });
    } catch (error) {
      Alert.alert('Failed to refresh token', error.message);
    }
  };

  revoke = async () => {
    try {
      await revoke(config, {
        tokenToRevoke: this.state.accessToken,
        sendClientId: true
      });
      this.animateState({
        accessToken: '',
        accessTokenExpirationDate: '',
        refreshToken: ''
      });
    } catch (error) {
      Alert.alert('Failed to revoke token', error.message);
    }
  };

  changeViewState = (stateVal) => {
    this.setState({
      viewState: stateVal
    })
  };

  authenticateWithThumb = () => {
    TouchID.isSupported().then(biometryType => {
      // Success code
      if (biometryType === 'FaceID') {
        console.log('FaceID is supported.');
      } else {
        console.log('TouchID is supported.');
      }

      TouchID.authenticate('Authenticate with fingerprint') // Show the Touch ID prompt
          .then(success => {
            // Touch ID authentication was successful!
            // Handle the successs case now
            console.log("Success: ", success);
          })
          .catch(error => {
            console.log("Rejection: ", error);
            // Touch ID Authentication failed (or there was an error)!
            // Also triggered if the user cancels the Touch ID prompt
            // On iOS and some Android versions, `error.message` will tell you what went wrong
          });

    })
        .catch(error => {
          // Failure code
          console.log("Is Supported failed: ", error);
        });


  };

  checkFirebaseServerTime = () => {
    const serverTime = firebase.database().getServerTime();
    console.log("Fetching Server Time from Firebase", serverTime);
  };

  renderViewState() {
    const {state} = this;
    switch (state.viewState) {
      default:
      case 0:
        return (
            <Page>
              {!!state.accessToken ? (
                  <Form>
                    <Form.Label>accessToken</Form.Label>
                    <Form.Value>{state.accessToken}</Form.Value>
                    <Form.Label>accessTokenExpirationDate</Form.Label>
                    <Form.Value>{state.accessTokenExpirationDate}</Form.Value>
                    <Form.Label>refreshToken</Form.Label>
                    <Form.Value>{state.refreshToken}</Form.Value>
                    <Form.Label>idToken</Form.Label>
                    <Form.Value>{state.idToken}</Form.Value>
                  </Form>
              ) : (
                  <Heading>{state.hasLoggedInOnce ? 'Goodbye.' : 'Hello, stranger.'}</Heading>
              )}

              <ButtonContainer>
                {!state.accessToken && (
                    <Button onPress={this.authorize} text="Authorize" color="#017CC0"/>
                )}
                <Button onPress={() => this.changeViewState(1)} text="Camera Page" color="#24C2CB"/>
                <Button onPress={() => this.changeViewState(2)} text="Thumb Page" color="#24C2CB"/>
                {!!state.refreshToken && <Button onPress={this.refresh} text="Refresh" color="#24C2CB"/>}
                {!!state.accessToken && <Button onPress={this.revoke} text="Revoke" color="#EF525B"/>}
              </ButtonContainer>

            </Page>
        );
      case 1:
        return (<Page>
          <Heading>{'Showing Camera Test Page'}</Heading>
          <RNCamera
              ref={ref => {
                this.camera = ref;
              }}
              style={styles.preview}
              type={RNCamera.Constants.Type.back}
              flashMode={RNCamera.Constants.FlashMode.on}
              permissionDialogTitle={'Permission to use camera'}
              permissionDialogMessage={'We need your permission to use your camera phone'}
              captureAudio={false}
              onGoogleVisionBarcodesDetected={({ barcodes }) => {
                console.log(barcodes);
              }}
          />
          <ButtonContainer>
            <Button onPress={() => this.changeViewState(0)} text="Token Page" color="#24C2CB"/>
            <Button onPress={() => this.changeViewState(2)} text="Thumb Page" color="#EF525B"/>
          </ButtonContainer>
        </Page>);
      case 2:
        return (<Page>
          <Heading>{'Integration Tests'}</Heading>
          <CenteredButtonContainer>
            <Button onPress={this.authenticateWithThumb} text="Touch to Authenticate" color="#24C2CB"/>
            <Button onPress={this.checkFirebaseServerTime} text="Touch to Check FB" color="#24C2CB"/>
          </CenteredButtonContainer>
          <ButtonContainer>
            <Button onPress={() => this.changeViewState(0)} text="Token Page" color="#24C2CB"/>
            <Button onPress={() => this.changeViewState(1)} text="Camera Page" color="#EF525B"/>
          </ButtonContainer>
        </Page>);
    }
  }

  render() {
    const {state} = this;
    return this.renderViewState()
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: 'black',
  },
  preview: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  capture: {
    flex: 0,
    backgroundColor: '#fff',
    borderRadius: 5,
    padding: 15,
    paddingHorizontal: 20,
    alignSelf: 'center',
    margin: 20,
  },
});