import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return <main className="page-shell grid min-h-screen place-items-center px-5"><section className="surface max-w-md rounded-lg p-8 text-center"><p className="eyebrow">Something needs attention</p><h1 className="mt-3 font-serif text-3xl text-white">Echo Estate could not load.</h1><p className="mt-4 text-sm leading-6 text-stone-400">Please refresh the page. If this continues, clear this site&apos;s browser storage and sign in again.</p><button className="gold-button mt-7" onClick={() => window.location.reload()}>Refresh page</button></section></main>;
    }
    return this.props.children;
  }
}
