/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alert';

export const login = async (email, password) => {
  // relative url to root, so it comes from the same domain. CORS policy dont block.
  // otherwise the browser thinks it comes from to different domains e.g. localhost and http://127.0.0.1:3000/
  try {
    const res = await axios({
      method: 'POST',
      url: '/api/v1/users/login',
      data: {
        email,
        password,
        withCredentials: true,
      },
    });

    if (res.data.status === 'success') {
      showAlert('success', 'Logged in successfully');
      window.setTimeout(() => {
        location.assign('/');
      }, 1500);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};

export const logout = async () => {
  try {
    const res = await axios({
      method: 'GET',
      url: '/api/v1/users/logout',
    });
    if (res.data.status === 'success') {
      location.reload();
    }
  } catch (err) {
    console.log(err.response);
    showAlert('error', 'Error logging out! try again.');
  }
};
