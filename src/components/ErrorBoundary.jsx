import { Component } from 'react'

/**
 * Contains render-time crashes from a subtree (e.g. react-pdf's <Document>
 * throwing on a malformed PDF) so one failing panel can't white-screen the
 * whole app. Shows `fallback` instead; `resetKey` clears the error when it
 * changes (a new document is opened).
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null })
    }
  }

  render() {
    if (this.state.error) {
      return typeof this.props.fallback === 'function'
        ? this.props.fallback(this.state.error)
        : this.props.fallback
    }
    return this.props.children
  }
}
